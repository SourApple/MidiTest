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
			
			for (var m = 0; m < trackNote.length; m++) {
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
			}

			
		}

	}

	var allNotes = ['C', 'C#' , 'D' , 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A' , 'A#', 'B'];

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