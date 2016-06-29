var rooms = {};
var media = {};
var accepted = {};
var mediaStream = null;
var isTextChat = true;
var TAG = 'IPC-VIDEO-CLIENT:';
var host = 'https://fac1.ipcortex.net';
IPCortex.PBX.Auth.setHost(host);

function processRoom(Room) {
  Room.addListener('update', function (room) {
    if (rooms[room.roomID] && room.state === 'dead') {
      rooms[room.roomID].elem.parentNode.removeChild(rooms[room.roomID].elem);
      delete rooms[room.roomID];
      return;
    }
    if (rooms[room.roomID].label !== room.label) {
      rooms[room.roomID].label = room.label;
      rooms[room.roomID].title.innerHTML = room.label + '(' + Room.roomID + ')';
    }
    /* If the room has come into existance due to a video request,
       start video with the stored stream */
    if (room.cID === media.cID && media.stream) {
      console.log(TAG, 'New room, starting video chat');
      /* Listen for updates on the Av instance */
      room.videoChat(media.stream).addListener('update', processFeed);
      media = {};
    }

    room.messages.forEach(function (message) {
      rooms[room.roomID].text.value += '\n' + message.cN + ' :\n  ' + message.msg;
      rooms[room.roomID].text.scrollTop = rooms[room.roomID].text.scrollHeight;
    });
  });
  var elem = document.getElementById('clone').cloneNode(true);
  elem.style.display = 'block';
  elem.id = Room.roomID;
  $('body').append(elem);

  var thisRoom = rooms[Room.roomID] = {
    room: Room,
    elem: elem,
    title: elem.getElementsByTagName('div')[0],
    text: elem.getElementsByTagName('textarea')[0]
  };

  var inputs = elem.getElementsByTagName('input');
  inputs[0].addEventListener('click', function () {
    thisRoom.room.leave();
  });
  inputs[2].addEventListener('click', function () {
    if (!inputs[1].value)
      return;
    thisRoom.room.post(inputs[1].value);
    inputs[1].value = '';
  });

  inputs[3].addEventListener('click', function () {
    isTextChat = !isTextChat;
    if (isTextChat) {
      mediaStream.getAudioTracks().forEach((track) => track.stop());
      mediaStream.getVideoTracks().forEach((track) => track.stop());
    } else {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(function (stream) {
          mediaStream = stream;
          thisRoom.room.videoChat(stream).addListener('update', processFeed);
        });
    }
  });
}

function processFeed(av) {
  /* Only process the Av instance if it has remote media */
  if (typeof (av.remoteMedia) != 'object')
    return;
  var videos = [];
  var feed = document.getElementById(av.id);
  for (var id in av.remoteMedia) {
    var video = document.getElementById(id);
    if (av.remoteMedia[id].status === 'offered') {
      /* If the remote party if offering create an invite */
      if (accepted[av.id])
        return;
      console.log(TAG, 'Offer recieved from ' + av.remoteMedia[id].cN);
      /* Mark the offer as accepted as we may get another
         update with the 'offer' state still set */
      accepted[av.id] = true;

      navigator.mediaDevices.getUserMedia({ video: false, audio: true })
        .then((stream) => {
          console.log(TAG, 'Accepting offer with user stream');
          av.accept(stream);
        });
    } else if (av.remoteMedia[id].status === 'connected' && !video) {
      console.log(TAG, 'New remote media source ' + av.remoteMedia[id]);
      /* Create a new video tag to play/display the remote media */
      video = document.createElement('video');
      attachMediaStream(video, av.remoteMedia[id]);
      videos.push(video);
      video.id = id;
      video.play();
    } else if (av.remoteMedia[id].status !== 'connected' && video) {
      /* Remove any video tags that are no longer in a 'connected' state */
      video.parentNode.removeChild(video);
    }
  }
  /* Create a feed container to hold video tags if it doesn't exist */
  if (videos.length && !feed) {
    feed = document.createElement('div');
    document.body.appendChild(feed);
    feed.className = 'feed';
    feed.id = av.id;
  }
  /* Add the new video tags to the feed container */
  videos.forEach(function (_video) {
    feed.appendChild(_video);
  });
  /* Remove the feed container if empty */
  if (feed && feed.children.length < 1)
    feed.parentNode.removeChild(feed);
}

function processContact(contact) {
  /* Don't process contacts that match the logged in user */
  if (contact.cID === IPCortex.PBX.Auth.id)
    return;
  var element = document.getElementById(contact.cID);
  /* Return early if contact exists */
  if (element) {
    /* Remove offline contacts */
    if (!contact.canChat && element.parentNode)
      element.parentNode.removeChild(element);
    return;
  }
  /* Create online contact */
  if (contact.canChat) {
    element = document.createElement('div');
    document.getElementById('contacts').appendChild(element);
    element.innerHTML = contact.name;
    element.className = 'contact';
    element.id = contact.cID;
    var offer = document.createElement('i');
    element.appendChild(offer);
    offer.className = 'material-icons contact-offer';
    offer.innerHTML = 'chat';
    offer.addEventListener('click', function () {
      contact.chat();
    });
  }
}

function startTask() {
  /* Start API collecting data */
  IPCortex.PBX.startFeed().then(
    function () {
      console.log(TAG, 'Live data feed started');
      /* API is ready, loop through the list of contacts */
      IPCortex.PBX.contacts.forEach(
        function (contact) {
          /* Listen for updates incase the contact changes state */
          contact.addListener('update', processContact);
          processContact(contact);
        }
      );
      /* Enable chat to allow feature (video negotiation) messages to be exchanged */
      var chatEnabled = IPCortex.PBX.enableChat(processRoom);

      if (chatEnabled) {
        console.log(TAG, 'Chat enable, enabling av feature');
        /* Register to receive new Av instances */
        IPCortex.PBX.enableFeature(
          'av',
          function (av) {
            /* Listen for updates to the Av instance */
            av.addListener('update', processFeed);
            processFeed(av);
          },
          ['chat']
        );
      }
    },
    function () {
      console.log(TAG, 'Live data feed failed');
    }
  );
}

/* Login */
IPCortex.PBX.Auth.login().then(
  function () {
    console.log(TAG, 'Login successful');
    startTask();
  },
  function () {
    console.log(TAG, 'Login failed');
  }
);
