const cally = require('callyjs')
const Discord = require('discord.js');
const express = require('express');
const { addEventToDB, addParticipantToEvent, getAllEvents, getEvent, removeParticipantFromEvent, deleteEvent } = require('./calendar')
const app = express();
const port = 3000;

process.env.TZ = 'America/New_York'

app.get('/', (req, res) => res.send('I\'m alive, I promise'));

app.listen(port, () => console.log(`listening at http://localhost:${port}`));




// ================= START BOT CODE ===================
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

let author = 0

function addConfirmReactions(msg) {
  return msg.react('✅')
        .then(() => msg.react('❌'))
}

function waitForConfirmation(msg) {
  const filter = (reaction, user) => {
    return ['✅', '❌'].includes(reaction.emoji.name) && user.id === author;
  };

  return msg.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
}

client.on('message', msg => {
  if (msg.content.startsWith('/event')) {
    const eventDetails = msg.content.slice(7)
    let appointment = new cally(eventDetails, new Date())
    author = msg.author.id
    msg.reply('Confirm: ' + appointment.subject + ' at ' + appointment.startdate.toLocaleDateString('en-US', { timeZone: 'America/New_York' }) + ' ' + appointment.startdate.toLocaleTimeString('en-US', { timeZone: 'America/New_York' }) + '?').then(eventMsg => {
      msg.delete()
      addConfirmReactions(eventMsg)
      .then(() => {
          const filter = (reaction, user) => {
            return ['✅', '❌'].includes(reaction.emoji.name) && user.id === author;
          };
          eventMsg.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
            .then(collected => {
              const reaction = collected.first();
              if (reaction.emoji.name === '✅') {
                eventMsg.delete()
                eventMsg.channel.send('New Event: ' + appointment.subject + ' at ' + appointment.startdate.toLocaleDateString('en-US', { timeZone: 'America/New_York' }) + ' ' + appointment.startdate.toLocaleTimeString('en-US', { timeZone: 'America/New_York' }) + '\nReact for reminders!')
                  .then((msg) => msg.react('❗')).then((reactionMessage) => {
                    addEventToDB(reactionMessage.message.id, appointment.startdate, appointment.subject)
                  })
              } else {
                eventMsg.delete()
              }
            })
            .catch(() => {
              eventMsg.delete()
            });
        })
    });
  } else if (msg.content.startsWith('/allEvents')) {
    getAllEvents()
      .then(events => Promise.all(events)
        .then(events => console.log(events)))
  }
});

function handleMessageReact(messageReaction, user) {
  // event reminder reaction
  handlePartialReaction(messageReaction).then(() => {
    if (messageReaction.message.author.username === 'Event Bot' && !messageReaction.me
      && messageReaction.message.content.includes('New Event:')) {
      msgId = messageReaction.message.id
      addParticipantToEvent(msgId, user.id)
      console.log('reaction added')
    }
  })
}

function handleReactionRemove(messageReaction, user) {
  // event reminder reaction removal
  handlePartialReaction(messageReaction).then(() => {
    if (messageReaction.message.author.username === 'Event Bot' && !messageReaction.me
      && messageReaction.message.content.includes('New Event:')) {
      msgId = messageReaction.message.id
      removeParticipantFromEvent(msgId, user.id)
      console.log('reaction removed')
    }
  })
}

async function handlePartialReaction(reaction) {
  if (reaction.partial) {
    // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Something went wrong when fetching the message: ', error);
      // Return as `reaction.message.author` may be undefined/null
      return;
    }
  }
}

client.on('messageReactionRemove', handleReactionRemove)

client.on('messageReactionAdd', handleMessageReact)

client.login(process.env.DISCORD_TOKEN);

function sendReminders() {
  getAllEvents()
    .then(events => Promise.all(events)
      .then(events => events
        .forEach(event => {
          eventDate = Date.parse(event.dateTime)
          timeNow = Date.now()
          minDiff = (eventDate - timeNow) / 1000 / 60;
          // Hour warning
          if (minDiff > 59.92 && minDiff < 60) {
            event.participants.forEach((partic) => {
              date = new Date(event.dateTime)
              timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              client.users.fetch(partic)
                .then(user => user.send('Hey! This is a reminder about \'' + event.eventDescription + '\'' + ' in 1 hour at ' + timeStr + '!'))
            })
          } else if (minDiff > 1439.92 && minDiff < 1440) {
            event.participants.forEach((partic) => {
              client.users.fetch(partic)
                .then(user => {
                  date = new Date(event.dateTime)
                  timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  user.send('Hey! This is a reminder about \'' + event.eventDescription + '\'' + ' at ' + timeStr + ' tomorrow!')
                })
            })
          } else if (minDiff < 0) {
            deleteEvent(event.id)
          }
        })))
}

setInterval(sendReminders, 5000)
