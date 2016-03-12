function Parser(midiFile){

	var trackStates = [];
	var beatsPerMinute = 120;
	var ticksPerBeat = midiFile.header.ticksPerBeat;
	var channelCount = 16;
	
	for (var i = 0; i < midiFile.tracks.length; i++) {
		trackStates[i] = {
			'nextEventIndex': 0,
			'ticksToNextEvent': (
				midiFile.tracks[i].length ?
					midiFile.tracks[i][0].deltaTime :
					null
			)
		};
	}

	var alltime = 0;

	var notes = [];
	//note = {'startTimeIndex': startTimeIndex, 'noteIndex' : noteIndex };

	var trackNote = [];
	//trackNote = {'startTime': startTime, 'note': [{'noteNumber': noteNumber, 'duration': duration}]};

	function formatDuration(trackNote){
		var minPeriod = document.getElementById('minimumPeriod').value || 50;
		var negligiblePeriod = document.getElementById('negligible').value || 5;

		for (var i = 0; i < trackNote.length; i++){
			if ((trackNote[i].note.length > 1) && (trackNote[i].note[0].noteNumber == 1000)){
				trackNote[i].note = trackNote[i].note.slice(1,3);	
			} else {
				trackNote[i].note = trackNote[i].note.slice(0,2);
			}
			//if (trackNote[i].note.length < 2){
			//	trackNote[i].note.push(trackNote[i].note[trackNote[i].note.length-1]);
			//}
		}

		//return trackNote;

		var maxTime = minPeriod * Math.round(trackNote[trackNote.length-1].startTime*1000/minPeriod);
		var formatTrack = [];

		for(var l = 0; l < maxTime/minPeriod; l++){
			formatTrack.push({'startTime': minPeriod*l, 'note':[], 'volume': 0, 'duration': 1});
		}

		var errorFree = true;
		for (var n = 0; n < trackNote.length; n++){
			var tn = trackNote[n];
			var formatIndex = Math.round(trackNote[n].startTime*1000/minPeriod);

			for(var m = 0; m < tn.note.length; m++){
				if (tn.note[m].duration*1000 > negligiblePeriod) {
					var dur = Math.round(tn.note[m].duration*1000/minPeriod);
					for (var s = 0; s < dur; s++){
						if (tn.note[m].noteNumber == 1000){
							formatTrack[formatIndex + s].note.push({'note': 'c', 
																'octave': 2});
							formatTrack[formatIndex + s].volume = 0;
						} else {
							try{
								formatTrack[formatIndex + s].note.push({'note': allNotes[tn.note[m].noteNumber % 12], 
																'octave': Math.floor(tn.note[m].noteNumber/12)});
								formatTrack[formatIndex + s].volume = 1;
							} catch(err){
								errorFree = false;	
							}
						}
					}
				}
			}

		}
		
		if (!errorFree){alert("An error occured. The results could possibly be messed up. Sorry!");}

		for (var o = 0; o < formatTrack.length; o++){
			formatTrack[o].note = formatTrack[o].note.slice(0,2);
			if (formatTrack[o].note.length == 0){
				formatTrack[o].note.push({'note': 'c', 'octave': 2});
			}
			if (formatTrack[o].note.length < 2){
				formatTrack[o].note.push(formatTrack[o].note[formatTrack[o].note.length-1]);
			}
		}

		return formatTrack;
	}

	function groupTrack(trackNote){
		var formatted = formatDuration(trackNote);
		var grouped = [];

		if (formatted.length > 0){
			grouped.push(formatted[0]);
			for(var i = 1; i < formatted.length; i++){
				if ((formatted[i].note[0].note == grouped[grouped.length-1].note[0].note) &&
					(formatted[i].note[0].octave == grouped[grouped.length-1].note[0].octave) &&
					(formatted[i].note[1].note == grouped[grouped.length-1].note[1].note) &&
					(formatted[i].note[1].octave == grouped[grouped.length-1].note[1].octave)){
					grouped[grouped.length-1].duration += 1;
				} else {
					grouped.push(formatted[i]);
				}
			}
		}

		return grouped;
	}

	function handleEvent() {
		getNextEvent();
		var event = nextEventInfo.event;
		var beatsToNextEvent = nextEventInfo.ticksToEvent / ticksPerBeat;
		var secondsToNextEvent = beatsToNextEvent / (beatsPerMinute / 60);

		alltime += secondsToNextEvent;
		//console.log(alltime);

		switch (event.type) {
			case 'meta':
				switch (event.subtype) {
					case 'setTempo':
						beatsPerMinute = 60000000 / event.microsecondsPerBeat
				}
				break;
			case 'channel':
				switch (event.subtype) {
					case 'noteOn':
						if (notes[event.noteNumber] == null){
							//channels[event.channel].noteOn(event.noteNumber, event.velocity);
							if ((trackNote.length > 0)&&
								((trackNote[trackNote.length - 1].startTime >= alltime - 0.005) && (trackNote[trackNote.length - 1].startTime <= alltime + 0.005))){
								trackNote[trackNote.length - 1].note.push({'noteNumber': event.noteNumber, 'duration': 0});
								
							} else {

								if ((trackNote.length > 0) && (trackNote[trackNote.length - 1].note[0].noteNumber == 1000)){
									trackNote[trackNote.length - 1].note[0].duration = alltime - trackNote[trackNote.length - 1].startTime;
								}

								trackNote.push({'startTime': alltime, 'note': []});
								trackNote[trackNote.length - 1].note.push({'noteNumber': event.noteNumber, 'duration': 0});
								
							}
							
							
								notes[event.noteNumber] = {'startTimeIndex': trackNote.length-1, 
										'noteIndex': trackNote[trackNote.length-1].note.length-1};
						}
						
						break;
					case 'noteOff':
						//channels[event.channel].noteOff(event.noteNumber, event.velocity);
						if (notes[event.noteNumber] != null){

							var startTimeIndex = notes[event.noteNumber].startTimeIndex;
							var noteIndex = notes[event.noteNumber].noteIndex;

							trackNote[startTimeIndex].note[noteIndex].duration = alltime - trackNote[startTimeIndex].startTime;

							notes[event.noteNumber] = null;
							var allNull = true;
							for (var s = 0; s < notes.length; s++){
								if (notes[s]!= null){
									allNull = false;
								}
							}

							if (allNull){
								trackNote.push({'startTime': alltime, 'note': [{'noteNumber': 1000, 'duration': 0}]});
							}
						}


						break;
					
				}
				break;
		}

		

		try{ 
			handleEvent();
		} catch(err) {
			//console.log(trackNote);
			
			/*for (var m = 0; m < trackNote.length; m++) {
				var el =  document.createElement("p")
				el.id="title";
				el.innerHTML = "Start Time: " + trackNote[m].startTime + "<br>";
				for(var n = 0; n < trackNote[m].note.length ; n++){

					var noteNum = trackNote[m].note[n].noteNumber; 

					if (noteNum == 1000) {
						if (trackNote[m].note.length == 1)
						{el.innerHTML += " SILENT " + " --- Duration: " + trackNote[m].note[n].duration;}
					} else {
						var noteVal = allNotes[noteNum % 12] + Math.floor(noteNum/12)
						el.innerHTML += " - Note:" + noteVal + " --- Duration: " + trackNote[m].note[n].duration + "<br>";
					}
				}
				document.body.appendChild(el);

			}*/
			var grouped = groupTrack(trackNote);
			//console.log(grouped);
			for (var m = 0; m < grouped.length; m++){
				var el =  document.createElement("p")
				el.id="title";
				el.innerHTML = "X ";
				for(var n = 0; n < grouped[m].note.length ; n++){

					el.innerHTML +=  grouped[m].note[n].note + " ";
					var octVal = alphabets[grouped[m].note[n].octave];
					el.innerHTML +=  octVal + " ";
					
				}

				el.innerHTML +=  alphabets[grouped[m].duration-1 > 25? 25: grouped[m].duration-1] + " " + grouped[m].volume + "\n";
				document.getElementById('result').value += el.innerHTML;
			}
			
		}
		

	}

	var allNotes = ['c', 'C' , 'd' , 'D', 'e', 'f', 'F', 'g', 'G', 'a' , 'A', 'b'];
	var alphabets = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];

	var nextEventInfo;
	var samplesToNextEvent = 0;
	
	function getNextEvent() {
		var ticksToNextEvent = null;
		var nextEventTrack = null;
		var nextEventIndex = null;
		
		for (var i = 0; i < trackStates.length; i++) {
			if (
				trackStates[i].ticksToNextEvent != null
				&& (ticksToNextEvent == null || trackStates[i].ticksToNextEvent < ticksToNextEvent)
			) {
				ticksToNextEvent = trackStates[i].ticksToNextEvent;
				nextEventTrack = i;
				nextEventIndex = trackStates[i].nextEventIndex;

				
			}
		}
		if (nextEventTrack != null) {
			/* consume event from that track */
			var nextEvent = midiFile.tracks[nextEventTrack][nextEventIndex];
			if (midiFile.tracks[nextEventTrack][nextEventIndex + 1]) {
				trackStates[nextEventTrack].ticksToNextEvent += midiFile.tracks[nextEventTrack][nextEventIndex + 1].deltaTime;
			} else {
				trackStates[nextEventTrack].ticksToNextEvent = null;
			}
			trackStates[nextEventTrack].nextEventIndex += 1;
			/* advance timings on all tracks by ticksToNextEvent */
			for (var i = 0; i < trackStates.length; i++) {
				if (trackStates[i].ticksToNextEvent != null) {
					trackStates[i].ticksToNextEvent -= ticksToNextEvent
				}
			}
			
			nextEventInfo = {
				'ticksToEvent': ticksToNextEvent,
				'event': nextEvent,
				'track': nextEventTrack
			}
			var beatsToNextEvent = ticksToNextEvent / ticksPerBeat;
			var secondsToNextEvent = beatsToNextEvent / (beatsPerMinute / 60);
			//samplesToNextEvent += secondsToNextEvent * synth.sampleRate;
			
			if ((nextEvent.subtype == "noteOn") || (nextEvent.subtype == "noteOff")) {
				var test = {
					'millisecondsToNextEvent': (beatsToNextEvent*1000 / (beatsPerMinute / 60)) + " seconds",
					'eventType': nextEvent.subtype,
					'eventNote': nextEvent.noteNumber
				};

				
			}

		} else {
			nextEventInfo = null;
			samplesToNextEvent = null;
			self.finished = true;

			//console.log(channels);
		}
	}


	handleEvent();

}
