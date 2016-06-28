var rooms = {}
var Authenticate = function () {
  this.login = function () {
    var TAG = 'IPC-CONTACTS:'
  /* Display a login prompt */
    IPCortex.PBX.Auth.setHost('https://fac1.ipcortex.net')
    IPCortex.PBX.Auth.login().then(
    function () {
      console.log(TAG, 'Login successful')
      $('#login').html('logout')
      /* Fetch the data from the PABX without live updates. */
      IPCortex.PBX.startFeed().then(
        function () {
          console.log(TAG, 'Data fetched')
          runApp()
        },
        function () {
          console.log(TAG, 'Data fetch failed')
        }
      )
    },
    function () {
      console.log(TAG, 'Login failed')
    }
  )

    function processContact (contact) {
      if (contact.cID === IPCortex.PBX.Auth.id)
        return
      var element = document.getElementById(contact.cID)
      if (element) {
        if (!contact.canChat && element.parentNode)
          element.parentNode.removeChild(element)
        return
      }
      if (contact.canChat) {
        element = document.createElement('div')
        document.getElementById('online-container').appendChild(element)
        element.innerHTML = contact.name
        element.className = 'contact'
        element.id = contact.cID
        var offer = document.createElement('i')
        element.appendChild(offer)
        offer.className = 'material-icons contact-offer'
        offer.innerHTML = 'chat_bubble'
        offer.addEventListener('click', function () {
          contact.chat()
        })
      }
    }

    function processRoom (Room) {
      Room.addListener('update', function (room) {
        if (rooms[room.roomID] && room.state === 'dead') {
          rooms[room.roomID].elem.parentNode.removeChild(rooms[room.roomID].elem)
          delete rooms[room.roomID]
          return
        }
        if (rooms[room.roomID].label !== room.label) {
          rooms[room.roomID].label = room.label
          rooms[room.roomID].title.innerHTML = room.label + '(' + Room.roomID + ')'
        }

        room.messages.forEach(function (message) {
          rooms[room.roomID].text.value += '\n' + message.cN + ' :\n  ' + message.msg
          rooms[room.roomID].text.scrollTop = rooms[room.roomID].text.scrollHeight
        })
      })
      var elem = document.getElementById('clone').cloneNode(true)
      elem.style.display = 'block'
      elem.id = Room.roomID
      $('body').append(elem)

      var thisRoom = rooms[Room.roomID] = {
        room: Room,
        elem: elem,
        title: elem.getElementsByTagName('div')[0],
        text: elem.getElementsByTagName('textarea')[0]
      }

      var inputs = elem.getElementsByTagName('input')
      inputs[0].addEventListener('click', function () {
        thisRoom.room.leave()
      })
      inputs[2].addEventListener('click', function () {
        if (!inputs[1].value)
          return
        thisRoom.room.post(inputs[1].value)
        inputs[1].value = ''
      })

      var method = 'chat'
      var methodMap = {
        chat: 'audio',
        audio: 'video',
        video: 'chat'
      }

      inputs[3].addEventListener('click', function () {
        method = methodMap[method]
        if (method === 'audio') {
          navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(function (stream) {
              thisRoom.room.videoChat(stream).addListener('update', processFeed)
            })
        } else if (method === 'video') {
          navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        }
      })
    }

    function processFeed (av) {
      console.log('av', av)
    }

    function runApp () {
      IPCortex.PBX.contacts.forEach(function (contact) {
        contact.addListener('update', function () {
          processContact(contact)
        })
        processContact(contact)
      })
      var chatEnabled = IPCortex.PBX.enableChat(processRoom)
      if (chatEnabled) {
        IPCortex.PBX.enableFeature('av', function (av) {
          av.addListener('update', processFeed)
          processFeed(av)
        }, ['chat'])
      }
    }
  }
  this.logout = function () {
    IPCortex.PBX.Auth.logout()
    $('#login').html('login')
  }
}
