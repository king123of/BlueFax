const Discord = require("discord.js");
const fs = require("fs");
let coins = require("./coinsystem.json");
let xp = require("./experience.json");
const bot = new Discord.Client();
bot.commands = new Discord.Collection();
let coinCooldown = new Set();
const coinCooldownSeconds = 5;
let yml = require("./yml.js")
const token = require("./token.json");
fs.readdir("./commands/", (err, files) => {

  if(err) console.log(err);
  let jsfile = files.filter(f => f.split(".").pop() === "js");
  if(jsfile.length <= 0){
  console.log("Could not find any commands.");
  return;
  }

  jsfile.forEach((f, i) =>{
  let props = require(`./commands/${f}`);
  console.log(`${f} loaded.`);
  bot.commands.set(props.help.name, props);
  });
});


bot.on("ready", async () => {
  const config = await yml("./config.yml");
  let gFile = require("./status.json");
  bot.user.setActivity(gFile.activity, { type: gFile.type });
  checkGiveaway();
  setInterval(checkGiveaway, 60000);
  console.log(`\x1b[33m`, `#-------------------------------#`)
  console.log('\x1b[32m', `BlueFox Bot v${config.BOT_VERSION} is now ONLINE!`)
  console.log('\x1b[36m%s\x1b[0m', `Thank you for using the BlueFox Bot!`)
  console.log('\x1b[36m%s\x1b[0m', `Have an issue? Talk To The Truth/Ubiquitous, The Developer!`)
  console.log('\x1b[36m%s\x1b[0m', `Bot Activity: ${gFile.type} ${gFile.activity}`)
  console.log(`\x1b[33m`, `#-------------------------------#`)
});

//Giveaway
function checkGiveaway() {
let giveaways = require("./giveaways.json");
giveaways.forEach(giveaway => {
    if(giveaway.end <= Date.now() && !giveaway.ended) {
        //giveaway has ended
        giveaways.find(g => g == giveaway).ended = true;
        fs.writeFile('./giveaways.json', JSON.stringify(giveaways), function(err) { if(err) console.log(err) })
        let guild = bot.guilds.get(giveaway.guild);
        let channel = guild.channels.get(giveaway.channel);
        if(guild && channel) {
            channel.fetchMessage(giveaway.messageID).then(msg => {
                let winners = [];
                let reactions = giveaway.reactions;
                for(let i = 0; i < giveaway.winners; i++) {
                    let user = reactions[~~(Math.random()*reactions.length)];
                    winners.push(user);
                    reactions.splice(reactions.indexOf(user), 1);
                }
                if(reactions.length < 1) return channel.send("No one entered the giveaway.");
                let embed = new Discord.RichEmbed()
                .setColor("#9cecfe")
                .setAuthor("Giveaway Winner")
                .setDescription("Congratulations to " + winners.filter(u => u).map(u => "<@" + u + ">").join(",") + " for winning the " + giveaway.name)
                .addBlankField()
                .setFooter("Open a ticket to claim your prize")
                .setThumbnail("https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/twitter/154/party-popper_1f389.png");
                channel.send(embed);

            })
        }
    }
})
}

bot.on('messageReactionAdd', function(reaction, user) {
let giveaways = require("./giveaways.json");
let giveaway = giveaways.find(g => g.messageID == reaction.message.id);
if(reaction.emoji.name == "??" && giveaway && !user.bot) {
    giveaways.find(g => g.messageID == reaction.message.id).reactions.push(user.id);
    fs.writeFile("./giveaways.json", JSON.stringify(giveaways), function(err) { if(err) console.log(err) });
}
})
bot.on('messageReactionRemove', function(reaction, user) {
let giveaways = require("./giveaways.json");
let giveaway = giveaways.find(g => g.messageID == reaction.message.id);
if(reaction.emoji.name == "??" && giveaway && giveaway.reactions.includes(user.id) && !user.bot) {
    giveaways.find(g => g.messageID == reaction.message.id).reactions.splice(giveaway.reactions.indexOf(user.id), 1);
    fs.writeFile("./giveaways.json", JSON.stringify(giveaways), function(err) { if(err) console.log(err) });
}
})

//Join message & Role on Join
bot.on("guildMemberAdd", async member => {
  const config = await yml("./config.yml");
  let color = config.Color;
  let channel = member.guild.channels.find(`name`, "welcome");
  let embed = new Discord.RichEmbed()
  .setColor(color)
  .setAuthor(`${member.user.username} Joined!`)
  .setDescription(`${member.user.username} ${config.Join_Message}`)
  if(config.Join_Message_In_Embed == "true") return channel.send(embed)
  if(config.Join_Message_In_Embed == "false") return channel.send(`${member.user.username}${config.Join_Message}`)

  let role = member.guild.roles.find("name", config.Join_Role);
    member.addRole(role);
});

//Leave Message
bot.on("guildMemberRemove", async member => {
  const config = await yml("./config.yml");
  let color = config.Color;
  let channel = member.guild.channels.find(`name`, "welcome");
  let embed = new Discord.RichEmbed()
  .setColor(color)
  .setAuthor(`${member.user.username} Left!`)
  .setDescription(`${member.user.username}${config.Leave_Message}`)
  if(config.Leave_Message_In_Embed == "true") return channel.send(embed)
  if(config.Leave_Message_In_Embed == "false") return channel.send(`${member.user.username}${config.Leave_Message}`)
});

bot.on("message", async message => {
  const config = await yml("./config.yml");
  let color = config.Color;
  if(message.author.bot) return;
  if(message.channel.type === "dm") return;
  fs.readFile("./prefixes.json", "utf8", function(err, prefixes) {
    if(err) return;
    prefixes = JSON.parse(prefixes);
    if(!prefixes[message.guild.id]){
      prefixes[message.guild.id] = {
        prefix: config.Prefix
      };
      fs.writeFile("./prefixes.json", JSON.stringify(prefixes), function(err) { if(err) console.log(err) });
    }
  
  
  //Coins
    if(!coins[message.author.id]){
    coins[message.author.id] = {
    coins: 0
    };
    }
    let coinAmt = Math.floor(Math.random() * 1) + 10;
    let baseAmt = Math.floor(Math.random() * 1) + 10;
    if(coinAmt === baseAmt){
    if(!coinCooldown.has(message.author.id)){
    coins[message.author.id] = {
    coins: coins[message.author.id].coins + coinAmt
    };
    fs.writeFile("./coinsystem.json", JSON.stringify(coins), (err) => {
    if (err) console.log(err)
    });
    coinCooldown.add(message.author.id);
    setTimeout(function(){
    coinCooldown.delete(message.author.id);
    }, coinCooldownSeconds*1000)
    }}
  
  
  //Experience
    let xpAdd = Math.floor(Math.random() * 10) + 50;
    if(!xp[message.author.id]){
      xp[message.author.id] = {
        xp: 0,
        level: 1
    };
    }
    let curxp = xp[message.author.id].xp;
    let curlvl = xp[message.author.id].level;
    let nxtLvl = xp[message.author.id].level * 5000;
    xp[message.author.id].xp =  curxp + xpAdd;
    if(nxtLvl <= xp[message.author.id].xp){
    xp[message.author.id].level = curlvl + 1;
    let lvlup = new Discord.RichEmbed()
    .setAuthor(`Congrats ${message.author.username}`, message.author.displayAvatarURL)
    .setTitle("You have leveled up!")
    .setThumbnail("https://i.imgur.com/lXeBiMs.png")
    .setColor(color)
    .addField("New Level", curlvl + 1);
    message.channel.send(lvlup);
    }
    fs.writeFile("./experience.json", JSON.stringify(xp), (err) => {
    if(err) console.log(err)
    });
    if(/\w+-\d+/.exec(message.channel.name)){
      let tickets = require("./tickets.json");
      let ticket = tickets.find(t => t && t.channel == message.channel.id);
      if(ticket) {
        if(!ticket.messages) ticket.messages = [];
        ticket.messages.push({
          content: message.content,
          time: message.createdTimestamp,
          author: message.author.username
        })
        fs.writeFile("./tickets.json", JSON.stringify(tickets), function(err){
          if(err) console.log(err)
        })
      }
    }
    let prefix = prefixes[message.guild.id].prefix;
    if(!message.content.startsWith(prefix)) return;
    let messageArray = message.content.split(" ");
    let cmd = messageArray[0];
    let args = messageArray.slice(1);
    let commandfile = bot.commands.get(cmd.slice(prefix.length));
    if(commandfile) commandfile.run(bot, message, args);
})
});

bot.login(token.Token);