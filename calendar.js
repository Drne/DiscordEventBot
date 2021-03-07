const Database = require("@replit/database")

const eventDB = new Database()

class CalendarEvent {
  constructor(id, dateTime, eventDescription) {
    this.id = id;
    this.dateTime = dateTime;
    this.eventDescription = eventDescription;
    this.participants = []
  }

  addParticipant(participant) {
    this.participants.push(participant)
  }

  removeParticipant(participant) {
    participants = self.participants.filter(function(partic) {
      return partic.id !== participant.id
    })
    self.participants = [...participants]
  }
}

async function getEvent(eventID) {
  return eventDB.get(eventID)
}

function addEventToDB(eventId, dateTime, eventDescription) {
  calEvent = new CalendarEvent(eventId, dateTime, eventDescription)
  eventDB.set(eventId, calEvent)
}

function addParticipantToEvent(eventId, participant) {
  eventDB.get(eventId).then(event => {
    event.participants.push(participant)
    eventDB.set(eventId, event)
  })

}

function removeParticipantFromEvent(eventId, participant) {
  getEvent(eventId).then(event => {
    participants = event.participants.filter(function(partic) {
      return partic.id !== participant.id
    })
    event.participants = [...participants]
    eventDB.set(eventId, event)
  })
}

async function getAllEvents() {
  return eventDB.list().then(keys => {
    eventPromises = []
    keys.forEach(key => {
      if (key) {
        eventPromises.push(eventDB.get(key))
      }
    })
    return eventPromises
  })
}

function deleteEvent(eventId) {
  eventDB.delete(eventId)
}

module.exports = { addEventToDB, addParticipantToEvent, getAllEvents, getEvent, removeParticipantFromEvent, deleteEvent }