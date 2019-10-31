using System;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AnimeMusicQuiz
{
    public class Startup
    {
        private class SecretClass
        {
            public int id;
            public bool spectateOnly;
            public string password;
        }

        string clientID = "635944292275453973";
        bool isDiscordConnected = false;
        Discord.Discord discord;
        Discord.ActivityManager activityManager;
        string toExecute = "";
        string lastSent = "";
        dynamic lastInput = new { lobbyIsPrivate = true };

        private string currentView { get; set; } = null;

        private void startDiscord()
        {
            //Environment.SetEnvironmentVariable("DISCORD_INSTANCE_ID", "0");
            discord = new Discord.Discord(Int64.Parse(clientID), (UInt64)Discord.CreateFlags.NoRequireDiscord);
            activityManager = discord.GetActivityManager();

            activityManager.OnActivityJoinRequest += (ref Discord.User user) =>
            {
                var reply = lastInput.lobbyIsPrivate ? Discord.ActivityJoinRequestReply.No : Discord.ActivityJoinRequestReply.Yes;
                activityManager.SendRequestReply(user.Id, reply, (res) => { });
            };

            activityManager.OnActivityJoin += secret =>
            {
                if (currentView == "Quiz") { return; }
                if (lastInput.avatar == null) { return; }
                var decoded = decodeSecret(secret);
                if (decoded.id == -1)
                {
                    toExecute = (decoded.spectateOnly) ? $"roomBrowser.fireSpectateGame(null)" : $"roomBrowser.fireJoinLobby(null)";
                }
                else
                {
                    toExecute = (decoded.spectateOnly) ? $"roomBrowser.fireSpectateGame({decoded.id}, '{decoded.password}')" : $"roomBrowser.fireJoinLobby({decoded.id}, '{decoded.password}')";
                }

            };
        }

        public async Task<object> Invoke(object _)
        {
            try
            {
                startDiscord();
                isDiscordConnected = true;
            }
            catch 
            {
                isDiscordConnected = false;
            }
            return (Func<object, Task<object>>)(async (dynamic input) =>
            {
                if (!isDiscordConnected)
                {
                    try
                    {
                        startDiscord();
                        isDiscordConnected = true;
                    }
                    catch
                    {
                        isDiscordConnected = false;
                    }
                    return returnHelper();
                }

                Discord.Activity activity;
                lastInput = input;
                currentView = input.currentView;
                if (currentView == null)
                {
                    activity = new Discord.Activity
                    {
                        Details = "Not logged in",
                        Assets =
                    {
                            LargeImage = "logo"
                    }
                    };
                }
                else
                {
                    string largeKeyValue;
                    string largeTextValue;
                    if (input.avatar != null)
                    {
                        largeKeyValue = $"{input.avatar.avatar}_{input.avatar.outfit}_{input.avatar.option}".Replace(" ", "_").ToLower();
                        largeTextValue = input.avatar.avatar;
                    }
                    else
                    {
                        largeKeyValue = "logo";
                        largeTextValue = null;
                    }

                    if (currentView == "Lobby")
                    {
                        activity = new Discord.Activity
                        {
                            Details = $"Waiting",
                            State = (input.gameMode == "Ranked") ? "Ranked Lobby" : ((input.lobbyIsPrivate) ? "Private Lobby" : "Public Lobby"),
                            Assets =
                            {
                                LargeImage = largeKeyValue,
                                LargeText = largeTextValue,
                                SmallImage = getGameModeKey(input.gameMode),
                                SmallText = input.gameMode
                            },
                            Party =
                            {
                                Id = $"lobby id={input.lobbyId}",
                                Size = {
                                    CurrentSize = input.currentPlayers,
                                    MaxSize = input.totalPlayers,
                                },
                            },
                            Secrets =
                            {
                                Join = encodeSecret()
                            },
                            Instance = true
                        };
                    }
                    else if (currentView == "Quiz")
                    {
                        activity = new Discord.Activity
                        {
                            Details = ((input.isSpectator) ? "Spectating" : "Playing") + ((input.gameMode == "Ranked") ? " Ranked" : ""),
                            State = $"{input.currentSongs}/{input.totalSongs} Songs",
                            Assets =
                            {
                                LargeImage = largeKeyValue,
                                LargeText = largeTextValue,
                                SmallImage = getGameModeKey(input.gameMode),
                                SmallText = input.gameMode
                            },
                            Party =
                            {
                                Id = $"lobby id={input.lobbyId}",
                                Size = {
                                    CurrentSize = input.currentPlayers,
                                    MaxSize = input.totalPlayers,
                                },
                            }
                        };
                    }
                    else if (currentView == "Expand Library" && input.songName != null)
                    {
                        activity = new Discord.Activity
                        {
                            Details = $"Currently in Expand Library",
                            State = $"Checking out '{input.songName}' by '{input.artistName}' from '{input.animeName}' [{input.typeName}]",
                            Assets =
                        {
                                LargeImage = largeKeyValue,
                                LargeText = largeTextValue
                        }
                        };
                    }
                    else
                    {
                        activity = new Discord.Activity
                        {
                            Details = $"Currently in {currentView}",
                            Assets =
                        {
                                LargeImage = largeKeyValue,
                                LargeText = largeTextValue
                        }
                        };
                    }
                }

                activityManager.UpdateActivity(activity, result => { });
                try
                {
                    discord.RunCallbacks();
                }
                catch
                {
                    isDiscordConnected = false;
                }

                return returnHelper();
            });
        }

        private string returnHelper()
        {
            if (lastSent != toExecute)
            {
                lastSent = toExecute;
                return toExecute;
            }
            return "";
        }

        private string getGameModeKey(string gameMode)
        {
            string rv = "logo";
            switch (gameMode)
            {
                case "Standard":
                    rv = "standard";
                    break;
                case "Quick Draw":
                    rv = "quick_draw";
                    break;
                case "Last Man Standing":
                    rv = "lastman";
                    break;
                case "Battle Royale":
                    rv = "battle_royale";
                    break;
            }
            return rv;
        }

        private string encodeSecret()
        {
            string s = (lastInput.currentView == "Quiz") ? "Q" : "L";
            string h = BitConverter.ToString(Encoding.Unicode.GetBytes(lastInput.lobbyPassword)).Replace("-", "");
            return $"{s}N{lastInput.lobbyId}N{h}";
        }

        private SecretClass decodeSecret(string secret)
        {
            string[] seperated = secret.Split('N');
            return new SecretClass
            {
                id = Int32.Parse(seperated[1]),
                spectateOnly = seperated[0] == "Q",
                password = HexHelper(seperated[2])
            };
        }

        private static string HexHelper(string hex)
        {
            byte[] raw = new byte[hex.Length / 2];
            for (int i = 0; i < raw.Length; i++)
            {
                raw[i] = Convert.ToByte(hex.Substring(i * 2, 2), 16);
            }
            return Encoding.Unicode.GetString(raw);
        }

    }

}
