# gps_logger
YSC GPS logger and app for conducting and recording race on the water.

Although this application works fine as a stand-alone python program on Raspberry Pi, when converting to javascript to run on a mobile phone there is a real problem keeping it running while the phone is not being used. So a simple webpage option was abandoned for this ReactNative monstrosity.

To set it up you will need nodejs, java and android studio along with all their dependencies. Look at the docs https://facebook.github.io/react-native/docs/getting-started To start with I used expo but had to abandon it and use React Native CLI. I ended up adding::

    import AsyncStorage from '@react-native-community/async-storage';
    import BackgroundTimer from 'react-native-background-timer';
    import { Audio } from 'expo-av';
    import BackgroundGeolocation from '@mauron85/react-native-background-geolocation';

and think I just followed the relevant instructions for each module. I went through quite a few iterations to find something that approximately worked so there might be steps I did for other modules that were relevant but I don't think so. For one or two the automatic build didn't seem to happen and I had to manually change the .gradle, .xml or .java files included in this repo - but just followed the online instructions.

I think the best approach would be to init a new react-native project then overwrite the `App.js` with the version from this repo and modify files in response to error messages as you try to run it!

I set my phone up for USB debugging as per the android studio instructions then ran a server in one terminal::

    $ react-native start

and in another terminal (cd to GpsLogger directory) ::

    $ react-native run android

When everything runs ok and the app appears and works on the attached phone then you can set up signing and release building as per https://facebook.github.io/react-native/docs/signed-apk-android which will create ./android/app/build/outputs/bundle/release/app.aab

You can get a java program from google called bundletool https://developer.android.com/studio/command-line/bundletool which will allow you to extract the apk from the aab bundle and install it on the attached phone::

    $ java -jar bundletool-all-0.13.0.jar build-apks --connected-device --bundle=/..path-to../GpsLogger/android/app/build/outputs/bundle/release/app.aab --output=/home/..other-path../app.apks
    $ java -jar bundletool-all-0.13.0.jar install-apks --apks=/..other-path../app.apks

The aab bundle is the file you upload to play.google.com

TODO::

    iOS - I don't have any apple kit so can't even begin this. Any volunteers?

    Option to vary start time but keep finish time the same - for pursuit races.

    Option to get race start times from the web server automatically rather than use the standard list 12.00, 13.00, 14.30, 16.00, 19.30