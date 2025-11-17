local isOpen = false
local resourceName = GetCurrentResourceName()

local function openPC()
    if isOpen then return end
    isOpen = true
    SetNuiFocus(true, true)
    SendNUIMessage({ action = 'open' })
end

local function closePC()
    if not isOpen then return end
    isOpen = false
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'close' })
end

RegisterNUICallback('close', function(_, cb)
    closePC()
    cb({ ok = true })
end)

RegisterNUICallback('login', function(_, cb)
    SendNUIMessage({ action = 'desktop' })
    cb({ ok = true })
end)

RegisterNUICallback('submitEvidence', function(data, cb)
    TriggerServerEvent('pd_pc:submitEvidence', data)
    cb({ ok = true })
end)

RegisterNUICallback('submitBooking', function(data, cb)
    TriggerServerEvent('pd_pc:submitBooking', data)
    cb({ ok = true })
end)

RegisterNUICallback('getEvidence', function(_, cb)
    TriggerServerEvent('pd_pc:requestEvidence')
    cb({ ok = true })
end)

RegisterNUICallback('getBookings', function(_, cb)
    TriggerServerEvent('pd_pc:requestBookings')
    cb({ ok = true })
end)

if Config.UseCommandForTesting then
    RegisterCommand(Config.TestCommand, function()
        openPC()
    end, false)
end

CreateThread(function()
    while true do
        Wait(0)
        if #Config.PCs > 0 then
            local ped = PlayerPedId()
            local pos = GetEntityCoords(ped)
            for _, pc in ipairs(Config.PCs) do
                local dist = #(pos - vector3(pc.x, pc.y, pc.z))
                if dist < (pc.radius or 1.5) then
                    BeginTextCommandDisplayHelp('STRING')
                    AddTextComponentSubstringPlayerName(('Press ~INPUT_PICKUP~ to use PC'))
                    EndTextCommandDisplayHelp(0, false, false, -1)
                    if IsControlJustPressed(0, 38) then
                        openPC()
                    end
                end
            end
        end
    end
end)

RegisterNetEvent('pd_pc:teleportToPrison', function(coords)
    local ped = PlayerPedId()
    SetEntityCoords(ped, coords.x + 0.0, coords.y + 0.0, coords.z + 0.0, false, false, false, true)
    SetEntityHeading(ped, coords.h or 0.0)
end)

RegisterNetEvent('pd_pc:releaseFromPrison', function(coords)
    local ped = PlayerPedId()
    SetEntityCoords(ped, coords.x + 0.0, coords.y + 0.0, coords.z + 0.0, false, false, false, true)
    SetEntityHeading(ped, coords.h or 0.0)
end)

RegisterNetEvent('pd_pc:sendEvidence', function(list)
    SendNUIMessage({ action = 'evidenceData', data = list or {} })
end)

RegisterNetEvent('pd_pc:sendBookings', function(list)
    SendNUIMessage({ action = 'bookingData', data = list or {} })
end)
