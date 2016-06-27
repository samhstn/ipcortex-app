var TAG = 'IPC-CONTACTS:';
/* Display a login prompt */
IPCortex.PBX.Auth.setHost('https://fac1.ipcortex.net');
IPCortex.PBX.Auth.login().then(
  function() {
    console.log(TAG, 'Login successful');
    /* Fetch the data from the PABX without live updates. */
    IPCortex.PBX.fetchData().then(
      function() {
        console.log(TAG, 'Data fetched');
        runApp();
      },
      function() {
        console.log(TAG, 'Data fetch failed');
      }
    );
  },
  function() {
    console.log(TAG, 'Login failed');
  }
);

function runApp() {
  IPCortex.PBX.contacts.forEach(function(contact) {
    console.log('username: ' + contact.uname + 'id: ' + contact.name);
  });
}
