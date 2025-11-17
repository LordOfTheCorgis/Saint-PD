Config = {}

Config.OpenKey = 'E'
Config.UseCommandForTesting = true
Config.TestCommand = 'pdpc' -- this will be removed once I'm done testing the script. 

Config.PCs = {
    { x = 441.20, y = -981.96, z = 30.69, radius = 1.6 }
}

Config.JailInside = { x = 1779.65, y = 2550.97, z = 45.57, h = 180.0 }
Config.JailRelease = { x = 1849.50, y = 2585.80, z = 45.67, h = 90.0 }

Config.ComputeJailFromCharges = true
Config.JailMaxSeconds = 300
Config.JailScale = 0.5

Config.WebhookUrl = '' -- set your Discord webhook URL here

--[[
please just leave this unless your using a state that starts there CASE files different
cause it should appear as: CASE-1752625265-123 ]]--
Config.CasePrefix = 'CASE'

Config.JSON = {}
Config.JSON.EvidencePath = 'data/evidence.json'
Config.JSON.BookingsPath = 'data/bookings.json'
Config.JSON.RotateAfter = 1000
