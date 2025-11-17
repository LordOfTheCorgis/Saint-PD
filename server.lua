local json = json

local function ensureDir(path)
    local parts = {}
    for part in string.gmatch(path, "[^/\\]+") do table.insert(parts, part) end
    local sofar = ''
    for i = 1, #parts - 1 do
        sofar = sofar .. (i == 1 and parts[i] or ('/' .. parts[i]))
        if not LoadResourceFile(GetCurrentResourceName(), sofar) then
            SaveResourceFile(GetCurrentResourceName(), sofar .. '/.keep', '', -1)
        end
    end
end

local function readJSON(path)
    local raw = LoadResourceFile(GetCurrentResourceName(), path)
    if not raw or raw == '' then return {} end
    local ok, data = pcall(function() return json.decode(raw) end)
    if ok and type(data) == 'table' then return data end
    return {}
end

local function writeJSON(path, data)
    ensureDir(path)
    SaveResourceFile(GetCurrentResourceName(), path, json.encode(data, { indent = true }), -1)
end

local function appendJSON(path, entry)
    local list = readJSON(path)
    table.insert(list, entry)
    if #list > (Config.JSON.RotateAfter or 1000) then
        local ts = os.time()
        local archive = path:gsub('%.json$', '') .. ('-%d.json'):format(ts)
        writeJSON(archive, list)
        list = {}
    end
    writeJSON(path, list)
end

local function generateCaseNumber()
    local prefix = Config.CasePrefix or 'CASE'
    local ts = os.time()
    local rnd = math.random(100, 999)
    return ("%s-%d-%d"):format(prefix, ts, rnd)
end

local function sendEmbeds(embeds)
    if not Config.WebhookUrl or Config.WebhookUrl == '' then return end
    PerformHttpRequest(Config.WebhookUrl, function() end, 'POST', json.encode({ embeds = embeds }), { ['Content-Type'] = 'application/json' })
end

local function sendEvidenceWebhook(src, data)
    local fields = {
        { name = 'Officer', value = tostring(data.officerName or src), inline = true },
        { name = 'Case', value = tostring(data.caseNumber or 'N/A'), inline = true },
        { name = 'SuspectID', value = tostring(data.suspectId or 'N/A'), inline = true },
        { name = 'Items', value = (data.items and table.concat(data.items, ', ') or ''), inline = false },
        { name = 'Attachments', value = ((type(data.attachments)=='table' and #data.attachments>0) and table.concat(data.attachments, ', ') or 'None'), inline = false },
        { name = 'Time', value = os.date('%c', data.timestamp or os.time()), inline = true },
    }
    local embeds = {
        { title = 'Evidence Logged', type = 'rich', fields = fields, color = 3447003 },
        { title = 'Description', type = 'rich', description = tostring(data.description or ''), color = 8359053 },
    }
    sendEmbeds(embeds)
end

local function sendBookingWebhook(src, entry)
    local chargesTxt = '[]'
    if type(entry.charges) == 'table' then
        chargesTxt = json.encode(entry.charges)
    end
    local fields = {
        { name = 'Officer', value = tostring(src), inline = true },
        { name = 'TargetID', value = tostring(entry.targetId or 'N/A'), inline = true },
        { name = 'Total Jail (sec)', value = tostring(entry.jailSeconds or 0), inline = true },
        { name = 'Charges', value = chargesTxt, inline = false },
        { name = 'Time', value = os.date('%c', entry.timestamp or os.time()), inline = true },
    }
    local embeds = {
        { title = 'Booking', type = 'rich', fields = fields, color = 15158332 },
        { title = 'Notes', type = 'rich', description = tostring(entry.notes or ''), color = 15844367 },
    }
    sendEmbeds(embeds)
end

RegisterNetEvent('pd_pc:submitEvidence', function(data)
    local src = source
    if type(data) ~= 'table' then return end
    data.timestamp = os.time()
    data.officer = tostring(data.officerName or src)
    if not data.caseNumber or data.caseNumber == '' then
        data.caseNumber = generateCaseNumber()
    end
    if type(data.attachments) ~= 'table' then data.attachments = {} end
    appendJSON(Config.JSON.EvidencePath, data)
    sendEvidenceWebhook(src, data)
end)

local jailTimers = {}

local function jailPlayer(target, seconds)
    if not target or not seconds or seconds <= 0 then return end
    TriggerClientEvent('pd_pc:teleportToPrison', target, Config.JailInside)
    if jailTimers[target] then
        if jailTimers[target].timer then
            -- no cancel primitive, allow previous to end early by overwriting
        end
    end
    local releaseAt = os.time() + seconds
    jailTimers[target] = { releaseAt = releaseAt }
    Citizen.CreateThread(function()
        local remaining = seconds
        while remaining > 0 and GetPlayerEndpoint(target) do
            Citizen.Wait(1000)
            remaining = remaining - 1
        end
        if GetPlayerEndpoint(target) then
            TriggerClientEvent('pd_pc:releaseFromPrison', target, Config.JailRelease)
        end
        jailTimers[target] = nil
    end)
end

RegisterNetEvent('pd_pc:submitBooking', function(data)
    local src = source
    if type(data) ~= 'table' then return end
    local target = tonumber(data.targetId)
    if not target then return end
    local seconds = 0
    -- sum from charges if present
    if type(data.charges) == 'table' then
        for _, c in ipairs(data.charges) do
            local t = tonumber(c.time or 0) or 0
            seconds = seconds + t
        end
    end
    -- fallback to provided totalTime or jailSeconds if sum is zero
    if seconds < 1 then
        seconds = tonumber(data.totalTime) or tonumber(data.jailSeconds) or 0
    end
    if seconds < 1 then return end
    if seconds > 300 then seconds = 300 end
    local entry = {
        timestamp = os.time(),
        officer = tostring(data.officerName or src),
        officerName = tostring(data.officerName or src),
        targetId = target,
        jailSeconds = seconds,
        charges = data.charges,
        notes = data.notes,
        name = data.name,
        dob = data.dob,
        sex = data.sex,
        address = data.address,
        phone = data.phone,
        arrestLocation = data.arrestLocation,
        arrestTime = data.arrestTime,
        mirandaTime = data.mirandaTime,
        plate = data.plate,
        mugshot = data.mugshot,
        medicalCleared = data.medicalCleared,
        inventory = data.inventory
    }
    appendJSON(Config.JSON.BookingsPath, entry)
    sendBookingWebhook(src, entry)
    jailPlayer(target, seconds)
    -- notify jailed player in chat (requires default chat)
    TriggerClientEvent('chat:addMessage', target, { args = { 'PD', ('You have been jailed for %d seconds.'):format(seconds) } })
end)

RegisterNetEvent('pd_pc:requestEvidence', function()
    local list = readJSON(Config.JSON.EvidencePath)
    TriggerClientEvent('pd_pc:sendEvidence', source, list)
end)

RegisterNetEvent('pd_pc:requestBookings', function()
    local list = readJSON(Config.JSON.BookingsPath)
    TriggerClientEvent('pd_pc:sendBookings', source, list)
end)
