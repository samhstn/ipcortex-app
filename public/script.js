var Authenticate = new Authenticate()

$('#login').on('click', function () {
  console.log($('#login').html())
  if ($('#login').html() === 'logout')
    Authenticate.logout()
  else
    Authenticate.login()
})
