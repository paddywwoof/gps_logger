import React, { Component } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, PermissionsAndroid 
    } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import BackgroundTimer from 'react-native-background-timer';
import { Audio } from 'expo-av';
import BackgroundGeolocation from '@mauron85/react-native-background-geolocation';

const AUDIO_OFFSETS = [[-360, "six_minutes"], [-180, "three_minutes"], [-120, "two_minutes"],
        [-60, "one_minute"], [-20, "twenty_seconds"], [-15, "fifteen_seconds"], [-10, "countdown"],
        [0, "cannon"], [60, "two_minutes"], [60, "to_second_start"], [120, "one_minute"],
        [120, "to_second_start"], [160, "twenty_seconds"], [165, "fifteen_seconds"],
        [170, "countdown"], [180, "cannon"], [2635, "race_ending_in"], [2640, "one_minute"],
        [2675, "race_ending_in"], [2680, "twenty_seconds"], [2685, "fifteen_seconds"],
        [2690, "countdown"], [2700, "finish_bell"]];

const AUDIO_ASSETS = {"six_minutes": require("./assets/sounds/six_minutes.mp3"),
    "three_minutes": require("./assets/sounds/three_minutes.mp3"),
    "two_minutes": require("./assets/sounds/two_minutes.mp3"),
    "one_minute": require("./assets/sounds/one_minute.mp3"),
    "twenty_seconds": require("./assets/sounds/twenty_seconds.mp3"),
    "fifteen_seconds": require("./assets/sounds/fifteen_seconds.mp3"),
    "countdown": require("./assets/sounds/countdown.mp3"),
    "cannon": require("./assets/sounds/cannon.mp3"),
    "to_second_start": require("./assets/sounds/to_second_start.mp3"),
    "race_ending_in": require("./assets/sounds/race_ending_in.mp3"),
    "finish_bell": require("./assets/sounds/finish_bell.mp3"),
    "button": require("./assets/sounds/button.mp3"),
    "tick": require("./assets/sounds/tick.mp3")};

const STD_STARTS = [43200, 46800, 52200, 59400, 70200, 73800]; //i.e. 1200, 1300, 1430, 1600, 1930

//////////////////////////////////////////////////////////////////////////////
//
async function requestLocationPermission() {
    try {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
                title: 'GPS Permission',
                message:
                'GPS logging needs to be granted permission',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
            },
        );
        if (!(granted === PermissionsAndroid.RESULTS.GRANTED)) {
        alert('GPS permission denied');
        }
    } catch (err) {
        alert(err);
    }
    try {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, {
                title: 'Save Info Permission',
                message:
                'Ideally save ID and Individuals List',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
            },
        );
        if (!(granted === PermissionsAndroid.RESULTS.GRANTED)) {
        alert('Save Info permission denied');
        }
    } catch (err) {
        alert(err);
    }
}

//////////////////////////////////////////////////////////////////////////////
/**  Utility functions
 * 
 * @param {string} backgroundColor
 * @param {string} flexDirection - 'column' (default) or 'row'
 * @param {number} flexGrow - weighting c.f. other flex block grow
 * @returns {object} - style as used by <View />
 */
function viewStyle(backgroundColor, flexDirection, flexGrow) {
    let style = {
        flex: 1,
        backgroundColor: backgroundColor,
        alignItems: 'stretch',
        justifyContent: 'center',
        padding: 3
    };
    if (flexDirection) {
        style.flexDirection = flexDirection;
    } else {
        style.flexDirection = 'column';
    }
    if (flexGrow) {
        style.flexGrow = flexGrow;
    }
    return style;
}

/**
 * @param {string} backgroundColor
 * @param {number} fontSize
 * @param {number} height
 * @returns {object} - style as used by <Text />
 */
function textStyle(backgroundColor, fontSize, height) {
    let style = {padding: 3,
            textAlignVertical: 'center',
            textAlign: 'center',
            flexGrow: 0.1,
            backgroundColor: backgroundColor};
    if (fontSize) {
        style.fontSize = fontSize;
    }
    if (height) {
        style.height = height;
    }
    return style;
}

/**
 * @param {string} text - hours and mins time as h:m or hh:mm
 * @returns {number} - seconds from midnight or -1 if error
 */
function textToSecs(text) {
    const hm = text.split(':');
    const h = parseInt(hm[0], 10);
    const m = parseInt(hm[1], 10);
    if (isNaN(h) || isNaN(m) || h > 24 || m > 59) {return -1;}
    return h * 3600 + m * 60;
}

/**
 * @param {number} secs - seconds after midnight
 * @returns {string} - HH:MM representation of time
 */
function secsToText(secs) {
    if (secs < 0) {return '00:00';}
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs - h * 3600) / 60);
    return h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0');
}

//////////////////////////////////////////////////////////////////////////////
/**
 * Logger is the main component and holds most of the mutable state stuff
 * */
export default class Logger extends Component {
    constructor(props) {
        super(props);
        this.changeNextStart = this.changeNextStart.bind(this);
        this.toggleRecording = this.toggleRecording.bind(this);
        this.selectID = this.selectID.bind(this);
        this.doLooping = this.doLooping.bind(this);
        this.retrieveData = this.retrieveData.bind(this);
        this.getIndividuals = this.getIndividuals.bind(this);
        this.state = {isRunning: false,
                      nextStart: -1,
                      lastFromStart: 1000000,
                      lastGpsTm: -1,
                      lastStdTm: -1,
                      individualsList: [],
                      individual: [0, ""],
                      audio: {},
                      data: [],
                      info: '',
                      uploadDone: '',
                      device: -1};
    }

    async retrieveData() {
        try {
            const individuals = await AsyncStorage.getItem('INDIVIDUALS');
            if (individuals !== null) {
                this.setState({individualsList: JSON.parse(individuals)});
            }
        } catch (error) {
            // prob first time running
        }

        try {
            const device = await AsyncStorage.getItem('DEVICE_ID');
            if (device !== null) {
                this.setState({device: parseInt(device)});
            }
            //alert('here');
        } catch (error) {
            //this generally doesn't happen
        }
        if (this.state.device < 0) {
            this.setState({device: Math.floor(Math.random() * 1000000000 + 1)});
            AsyncStorage.setItem('DEVICE_ID', '' + this.state.device);
            alert('id ' + this.state.device);
        }
    }

    getIndividuals() {
        fetch('https://www.yeadonsailingclub.co.uk/gpsupload/get_individuals.php') //TODO use post with some kind of security token?
            .then((response) => response.json())
            .then((responseJson) => {
                this.setState({individualsList: responseJson});
                AsyncStorage.setItem('INDIVIDUALS', JSON.stringify(this.state.individualsList));
            })
            .catch(async (error) =>{
                alert('' + error + '\nUsing last list. Prob OK unless any new entries.');
            });
    }

    componentDidMount(){
        requestLocationPermission(); //needed for GPS to work on android TODO stuff for iOS, do something with returned Promise?
        this.retrieveData();
        this.getIndividuals();
        Audio.setAudioModeAsync({
            staysActiveInBackground: true, // needed for background playing
            playThroughEarpieceAndroid: false, // one of this or next needed to play through speaker
            interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX});
        const audioTmp = {};
        Object.keys(AUDIO_ASSETS).forEach(async key => {
            audioTmp[key] = new Audio.Sound();
            try {
                await audioTmp[key].loadAsync(AUDIO_ASSETS[key]);
            } catch (error) {
                alert('problem loading ' + key + '.mp3');
            }
        });
        this.setState({audio: audioTmp});

        BackgroundGeolocation.configure({
            startForeground: true,
            desiredAccuracy: BackgroundGeolocation.HIGH_ACCURACY,
            stationaryRadius: 5,
            distanceFilter: 5,
            notificationTitle: 'Background tracking',
            notificationText: 'enabled',
            debug: false,
            startOnBoot: false,
            stopOnTerminate: true,
            locationProvider: BackgroundGeolocation.ACTIVITY_PROVIDER,
            interval: 5000,
            fastestInterval: 5000,
            activitiesInterval: 5000,
            stopOnStillActivity: false,
        });

        BackgroundGeolocation.on('location', (p) => {
            BackgroundGeolocation.startTask(taskKey => {
                const tm = p.time;
                const lat = p.latitude;
                const lon = p.longitude;
                const acc = Math.round(p.accuracy * 10) / 10;
                this.setState({data: this.state.data.concat([[tm, lat, lon, acc]])});
                this.setState({info: `${this.state.data.length}\nlat: ${lat}\nlon: ${lon}\ntm: ${tm}\nacc: ${acc}m`});
                BackgroundGeolocation.endTask(taskKey);
            });
        });

        const dttm = new Date();
        const dt = dttm.valueOf() % 5000;
        setTimeout(this.doLooping, dt); // delay looping to match 5s
    }
  
    changeNextStart(text) {
        const newStart = textToSecs(text);
        if (newStart > 0) {
            this.setState({nextStart: newStart});
            this.state.audio["button"].replayAsync();
            return true;
        }
        return false;
    }

    toggleRecording(onOff) {
        this.setState({isRunning: onOff});
        if (onOff) { // true => start recording, false => stop recording
            BackgroundGeolocation.start();
        } else {
            BackgroundGeolocation.stop();
        }
        this.state.audio["button"].replayAsync();
    }

    selectID(item) {
        this.setState({individual: item});
        this.state.audio["button"].replayAsync();
        this.setState({uploadDone: ''});
    }

    doLooping() {
        const intervalId = BackgroundTimer.setInterval(() => {
            const dttm = new Date();
            const now = dttm.getHours() * 3600 + dttm.getMinutes() * 60 + dttm.getSeconds();
            const fromStart = now - this.state.nextStart;
            if (this.state.isRunning) { //only do audio and gps if started
                this.state.audio["tick"].replayAsync(); // hack to keep audio playing!!
                AUDIO_OFFSETS.forEach(val => {
                    if (fromStart >= val[0] && this.state.lastFromStart < val[0]) {
                        this.state.audio[val[1]].replayAsync();
                    }
                });
            }
            this.setState({lastFromStart: fromStart});
            if (now > (this.state.lastStdTm + 10)) {
                const maxOffset = AUDIO_OFFSETS[AUDIO_OFFSETS.length - 1][0];
                if ((fromStart > maxOffset || this.state.nextStart == -1) && now < STD_STARTS[STD_STARTS.length - 1]) {
                    for (let stSt of STD_STARTS) {
                        if (now < stSt) {
                            this.setState({nextStart: stSt});
                            break;
                        }
                    }
                }
                this.setState({lastStdTm: now});
            }
        }, 2500); //every 2.5 seconds - audio stops working if less frequent!
    }

    render() {
        let button;
        if (this.state.isRunning) {
            button = <StartStopButton onOff={false} color='orangered' startStop='STOP' toggleRecording={this.toggleRecording} />
        } else {
            button = <StartStopButton onOff={true} color='palegreen' startStop='START' toggleRecording={this.toggleRecording} />
        }
        let uploadButton;
        if (this.state.individual[0] != 0 && this.state.data.length > 0) {
            let jobDone = '';
            uploadButton = <Text
                style={textStyle('pink')}
                delayLongPress={400}
                onLongPress={
                () => {
                    fetch('https://www.yeadonsailingclub.co.uk/gpsupload/race_logger_ajax.php',
                        {method: 'POST',
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            individual: this.state.individual[0],
                            device: this.state.device,
                            data: this.state.data
                        })}
                    )
                    .then((response) => {
                        return response.json();
                    })
                    .then((responseJson) => {
                        if (responseJson.status > 0) {
                            this.setState({data: []});
                            this.setState({individual: [0, '']});
                        }
                    })
                    .catch((error) =>{
                        console.log(error);
                    });
                    this.state.audio["button"].replayAsync();
                }
                }>UPLOAD DATA{this.state.uploadDone}</Text>
        }
        return (
        <View style={viewStyle('white')}>
            {button}
            <Competitor dataList={this.state.individualsList} selectID={this.selectID} selectedIndividual={this.state.individual} />
            <View style={viewStyle('white', 'row', 0.4)}>
                <NextStart nextStart={secsToText(this.state.nextStart)} changeNextStart={this.changeNextStart}/>
                <View style={viewStyle('orange', 'column', 0.4)}>
                    <Text>{this.state.info}</Text>
                    <Text style={textStyle('beige')}
                        delayLongPress={400}
                        onLongPress={() => {
                            this.getIndividuals();
                            this.state.audio["button"].replayAsync();
                        }
                    }>RELOAD INDIVIDALS LIST</Text>
                </View>
            </View>
            <View style={viewStyle('powderblue', 'column', 0.2)}>
                <Text style={textStyle('beige')}>
                    Yeadon Sailing Club. Automated racing App: OOD in your pocket!</Text>
                <Text style={textStyle('beige')}>
                    You need wifi or data to fill or update the list of individuals and to upload data;
                    Turn it off when sailing to save battery. GPS is needed for recording race position.
                    Buttons to Start or Stop recording, select individual, or upload to server require 
                    <Text style={{fontWeight: 'bold'}}> 'Long Press' </Text>
                </Text>
            </View>
            {uploadButton}
        </View>
        );
    }
}

//////////////////////////////////////////////////////////////////////////////
class NextStart extends Component {
    constructor(props) {
        super(props);
        this.state = {changeText: ''};
        this.handleChangeText = this.handleChangeText.bind(this);
    }

    handleChangeText(text) {
        return this.props.changeNextStart(text);
    }

    render() {
        return (
            <View style={viewStyle('skyblue', 'column', 0.6)}>
                <Text style={textStyle('beige')}>Next/current start {this.props.nextStart}</Text>
                <TextInput
                    style={textStyle('white')}
                    placeholder="Type revised start HH:MM"
                    onChangeText={(text) => {
                            if (text.length == 5 && this.handleChangeText(text)) {
                                this.setState({changeText: ''});
                            } else {
                                this.setState({changeText: text});
                            }
                        }}
                    value={this.state.changeText}
                />
            </View>
        );
    }
}

//////////////////////////////////////////////////////////////////////////////
class StartStopButton extends Component {
    constructor(props) {
        super(props);
        this.handleLongPress = this.handleLongPress.bind(this);
    }

    handleLongPress() {
        this.props.toggleRecording(this.props.onOff);
    }

    render() {
        return (
            <Text style={textStyle(this.props.color)}
                delayLongPress={400}
                onLongPress={() => {
                    this.handleLongPress();
                }
                }>{this.props.startStop} RECORDING</Text>
        );
    }
}

//////////////////////////////////////////////////////////////////////////////
class Competitor extends Component {
  constructor(props) {
    super(props);
    this.handleLongPress = this.handleLongPress.bind(this);
    this.state = {text: '',};
  }

  handleLongPress(item) {
      this.props.selectID(item);
  }

  render() {
    let filtered_list = [];
    const findText = this.state.text.toLowerCase();
    this.props.dataList.forEach(val => {
            const filter = val[1].toLowerCase();
            if (filter.includes(findText)) {
                filtered_list.push(val);
            }
        }
    );
    let selHt = 1;
    if (this.props.selectedIndividual[0] > 0) {
        selHt = 40;
    }
    return (
        <View style={viewStyle('white', 'column', 0.6)}>
            <TextInput
                style={{height: 40}}
                placeholder="Type filter text here (part of name or sail num)"
                onChangeText={(text) => this.setState({text})}
                value={this.state.text}
            />
            <FlatList
                data={filtered_list}
                renderItem={({item}) => <Text style={textStyle('white', 16)}
                                              delayLongPress={400}
                                              onLongPress={() => {
                                                  this.handleLongPress(item)
                                              }}>{item[1]}</Text>
                }
                keyExtractor={item => '' + item[0]}
            />
            <Text style={textStyle('yellow', 20, selHt)}>{this.props.selectedIndividual[1]}</Text>
        </View>
    );
  }
}
