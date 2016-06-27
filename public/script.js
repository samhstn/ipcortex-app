$('#login').on('click', function(e) {
  console.log($('#login').html());
  if($('#login').html() === 'logout') {
    logout();
  } else {
    login();
  }
});


