$( "#search" ).click(function() {  // animate the settings cog onclick
	let flightCode = $('#search-bar').val();
	let reg = /([A-Za-z][A-Za-z]?[A-Za-z])([0-9]{1,4})/;

	if ( !(matchExact(reg, flightCode)) ) {  // check to prevent invalid flight codes
		alert('The format for the flight code is invalid.');
		return false;
	}

	if ( !(dateValidation($('#datepicker').val())) ) {  // check to prevent invalid date inputs
		alert('The format for the date is invalid.');
		return false;
	}

	let fullDate = $('#datepicker').datepicker('getDate');
	let airlinePrefix = flightCode.match(reg)[1];
	let flightNumber = flightCode.match(reg)[2]
	let month = parseInt(fullDate.getMonth())+1;
	let day = fullDate.getDate();
	let year = fullDate.getFullYear();
	let requestUrl = 'https://api.flightstats.com/flex/schedules/rest/v1/json/flight/' + airlinePrefix + '/' + flightNumber + '/departing/'+ year + '/' + month + '/' + day;
	let params = jQuery.param({
		appId: config.appId,
		appKey: config.apiKey
	});
	requestUrl = 'https://cors.io/?' + requestUrl + '?' + params;
	console.log(requestUrl);

	$.getJSON(requestUrl, function(json) {
		console.log(json);
		// todo handle requests with no scheduled flights
		// todo handle multiple scheduled flights
		let flight = json['scheduledFlights'][0];
		let arrivalAirportCode = flight["arrivalAirportFsCode"];
		let departureAirportCode = flight["departureAirportFsCode"];
		let departureTime = flight['departureTime'];
		let arrivalTime = flight['arrivalTime'];
		$(".arrive .airport-code").text(arrivalAirportCode); // set departing airport code
		$(".depart .airport-code").text(departureAirportCode);  // set arriving airport code
		let airlinePrefix = json['request']['carrier']['fsCode'];
		let flightNumber = json['request']['flightNumber']['interpreted'];
		let airlines = json['appendix']['airlines'];
		// todo add travel time to header
		let departureAirport = findEntity(arrivalAirportCode, json['appendix']['airports']);
		let arrivalAirport = findEntity(departureAirportCode, json['appendix']['airports']);
		$(".arrive .airport-name").text(departureAirport['name']);
		$(".depart .airport-name").text(arrivalAirport['name']);
		let departureTimezone = arrivalAirport['timeZoneRegionName'];
		let arrivalTimezone = departureAirport['timeZoneRegionName'];
		departureTime = moment(departureTime);
		arrivalTime = moment(arrivalTime);
		$(".depart .time-value").text(departureTime.tz(departureTimezone).format('h:mm A'));
		$(".arrive .time-value").text(arrivalTime.tz(arrivalTimezone).format('h:mm A'));
		$(".depart .flight-date").text(departureTime.format('dddd, MMM. Do, YYYY'));
		$(".arrive .flight-date").text(arrivalTime.format('dddd, MMM. Do, YYYY'));
		let flightTime = moment.duration(arrivalTime.diff(departureTime));

		// TODO SET LOCAL TIME VALUES -- NOT DONE !!!

		$("#results-detail-header").text(
			findEntity(airlinePrefix, airlines)['name'] + ' ' + airlinePrefix + flightNumber + ' ('+flightTime.get('hours')+'h '+flightTime.get('minutes')+'m)'
		);  // set table header
	});
});


function findEntity(itemCode, itemsList){
	return $.grep(itemsList, function(item){
		return item['fs'] == itemCode;
	})[0];  // only first result
};


// FOR DEVELOPMENT
// sleep time expects milliseconds
function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

$('#search-bar').val('UA267');
$('#datepicker').val('11/22/2018');
sleep(20).then(() => {
	$('#search').click();
});
// END FOR DEVELOPMENT

function dateToGCalFormat(d) {
	return d.toISOString().replace(/-|:|\.\d\d\d/g,"");
}

function dateValidation(d) {
	return !!new Date(d).getTime();
}

function matchExact(r, str) {
	var match = str.match(r);
	return match != null && str == match[0];
}
