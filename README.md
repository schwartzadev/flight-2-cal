# Flights --> Google Calendar Events
A webapp to generate Google Calendar events based off of flight information

## Usage
In order to run this app, you will need to get a FlightStats API key, which can be obtained on the [Flight Stats website](https://developer.flightstats.com).

Once you have registered for the FlightStats API, you will need to add a file at the root directory, titled `config.js` as follows:

```js
var config = { 
  appId: '',
  apiKey: ''
}

```
Once that is complete, the app should all be good to go!
