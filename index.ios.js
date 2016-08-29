/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  ActivityIndicator,
  PanResponder,
  CameraRoll, 
  AlertIOS, 
  Text,
  Dimensions,
  View
} from 'react-native';

var RandManager = require('./RandManager.js');
var Utils = require('./Utils.js');
var Swiper = require('react-native-swiper');
var NetworkImage = require('react-native-image-progress');
var Progress = require('react-native-progress');
var ProgressHUD = require('./ProgressHUD.js');
var ShakeEvent = require('react-native-shake-event-ios');

var {width, height} = Dimensions.get('window');

const NUM_WALLPAPERS = 5;
const DOUBLE_TAP_DELAY = 300; // milliseconds
const DOUBLE_TAP_RADIUS = 20;
const LONG_PRESS_MIN_DURATION = 1000; // milliseconds

class SplashWalls extends Component {
	constructor(props) {
		super(props);
		this.state = {
			wallsJSON: [],
			isLoading: true,
			isHudVisible: false
		}
		this.imagePanResponder = {};
		this.prevTouchInfo = {
		  prevTouchX: 0,
		  prevTouchY: 0,
		  prevTouchTimeStamp: 0
		};
		this.handlePanResponderGrant = this.handlePanResponderGrant.bind(this);
		this.handlePanResponderRelease = this.handlePanResponderRelease.bind(this);
		this.onMomentumScrollEnd = this.onMomentumScrollEnd.bind(this);
		this.currentWallIndex = 0;
		this.long_press_timeout = 0;
	}
	fetchWallsJSON() {
		var url = 'https://unsplash.it/list';
		fetch(url)
		.then( response => response.json() )
		.then( jsonData => {
			var randomIds = RandManager.uniqueRandomNumbers(NUM_WALLPAPERS, 0, jsonData.length);
			var walls = [];
			randomIds.forEach(randomId => {
				walls.push(jsonData[randomId]);
			});
			
			this.setState({
				isLoading: false,
				wallsJSON: [].concat(walls)
		  	});
	  	})
		.catch( error => console.log('Fetch error ' + error) );
	}
	initialize() {
	  this.setState({
	    wallsJSON: [],
	    isLoading: true,
	    isHudVisible: false
	  });
	
	  this.currentWallIndex = 0;
	}
	componentWillMount() {
	    this.imagePanResponder = PanResponder.create({
	      onStartShouldSetPanResponder: this.handleStartShouldSetPanResponder,
	      onPanResponderGrant: this.handlePanResponderGrant,
	      onPanResponderMove: this.handlePanResponderMove,
	      onPanResponderRelease: this.handlePanResponderRelease,
	      onPanResponderTerminate: this.handlePanResponderEnd
	    });
		ShakeEvent.addEventListener('shake', () => {
			this.initialize();
			this.fetchWallsJSON();
		});
	}
	handleStartShouldSetPanResponder(e, gestureState) {
	    return true;
	}
	isDoubleTap(currentTouchTimeStamp, {x0, y0}) {
	  var {prevTouchX, prevTouchY, prevTouchTimeStamp} = this.prevTouchInfo;
	  var dt = currentTouchTimeStamp - prevTouchTimeStamp;
	
	  return (dt < DOUBLE_TAP_DELAY && Utils.distance(prevTouchX, prevTouchY, x0, y0) < DOUBLE_TAP_RADIUS);
	}
	handlePanResponderGrant(e, gestureState) {
		console.log('Start of touch');
		var currentTouchTimeStamp = Date.now();
		
		this.long_press_timeout = setTimeout(function(){
				if (gestureState.x0 <= width/2 )
				{
					AlertIOS.alert(
				      'Left',
				      'Long click on the left side detected',
				      [
				        {text: 'Tru dat'}
				      ]
				    );
				}
				else {
					AlertIOS.alert(
				      'Right',
				      'So you clicked on the right side?',
				      [
				        {text: 'Indeed'}
				      ]
				    );
				}
			}, 
			LONG_PRESS_MIN_DURATION);
		if( this.isDoubleTap(currentTouchTimeStamp, gestureState) ){
			clearTimeout(this.long_press_timeout);
			this.saveCurrentWallpaperToCameraRoll();
		}
		
		this.prevTouchInfo = {
			prevTouchX: gestureState.x0,
			prevTouchY: gestureState.y0,
			prevTouchTimeStamp: currentTouchTimeStamp
		};
	}
	handlePanResponderMove(e, gestureState) {
		clearTimeout(this.long_press_timeout);
	}
	handlePanResponderRelease(e, gestureState){
		clearTimeout(this.long_press_timeout);
		console.log('Touch released');
	}
	handlePanResponderEnd(e, gestureState) {
		clearTimeout(this.long_press_timeout);
		console.log('Finger pulled up from the image');
	}
	
	onMomentumScrollEnd(e, state, context) {
	  this.currentWallIndex = state.index;
		clearTimeout(this.long_press_timeout);
	}
	saveCurrentWallpaperToCameraRoll() {
		
	  this.setState({isHudVisible: true});
	  
	  var {wallsJSON} = this.state;
	  var currentWall = wallsJSON[this.currentWallIndex];
	  var currentWallURL = 'https://unsplash.it/'+currentWall.width +'/'+currentWall.height+'?image='+currentWall.id;
	
	  var saved = CameraRoll.saveToCameraRoll(currentWallURL, 'photo');
	  this.setState({isHudVisible: false});
	  if (saved) {
	    AlertIOS.alert(
	      'Saved',
	      'Wallpaper successfully saved to Camera Roll',
	      [
	        {text: 'High 5!', onPress: () => console.log('OK Pressed!')}
	      ]
	    );
	  }
	  else {
	    AlertIOS.alert('Error',
	    'Error saving to camera roll',
	    [
			{text: 'Sad story :(', onPress: () => console.log('Error Pressed!')}
		]);
	  }
	
	}
	componentDidMount() {
		this.fetchWallsJSON();
	}
	renderLoadingMessage() {
    return (
	<View style={styles.loadingContainer}>
        <ActivityIndicator
          animating={true}
          color={'#fff'}
          size={'small'} 
          style={{margin: 15}} />
          <Text style={{color: '#fff'}}>Contacting Unsplash</Text>
	</View>
    );
  }

  renderResults() {
	  var {wallsJSON, isLoading} = this.state;
	  if( !isLoading ) {
	    return (
		<View>
		    <Swiper
			dot={<View style={{backgroundColor:'rgba(255,255,255,.7)', width: 8, height: 8,borderRadius: 10, marginLeft: 3, marginRight: 3, marginTop: 3, marginBottom: 3,}} />}
			activeDot={<View style={{backgroundColor: '#fff', width: 13, height: 13, borderRadius: 7, marginLeft: 7, marginRight: 7}} />}
	loop={false}
	onMomentumScrollEnd={this.onMomentumScrollEnd}
	>
		        {wallsJSON.map((wallpaper, index) => {
		          return(
					<View key={index}>
						<NetworkImage
							source={{uri:'https://unsplash.it/'+wallpaper.width +'/'+wallpaper.height+'?image='+wallpaper.id}}
							indicator={Progress.Circle}
							indicatorProps={{
								color: 'rgba(255, 255, 255)',
								size: 60,
								thickness: 7  
							}}
							style={styles.wallpaperImage}
							{...this.imagePanResponder.panHandlers}>
							<Text style={styles.label}>Photo by</Text>
							<Text style={styles.label_authorName}>{wallpaper.author}</Text>
						</NetworkImage>
					</View>
		          );
		        })}  
		    </Swiper>
		    <ProgressHUD width={width} height={height} isVisible={this.state.isHudVisible}/>
	    </View>
	    );
	  }
  }
  render() {
    var {isLoading} = this.state;
    if(isLoading)
      return this.renderLoadingMessage();
    else
      return this.renderResults();
  }
}

const styles = StyleSheet.create({
	loadingContainer: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#000'
	},
	wallpaperImage: {
		flex: 1,
		width: width,
		height: height,
		backgroundColor: '#000'
	},
	label: {
		position: 'absolute',
		color: '#fff',
		fontSize: 13,
		backgroundColor: 'rgba(0, 0, 0, 0.8)',
		padding: 2,
		paddingLeft: 5,
		top: 20,
		left: 20,
		width: width/2
	},
	label_authorName: {
		position: 'absolute',
		color: '#fff',
		fontSize: 15,
		backgroundColor: 'rgba(0, 0, 0, 0.8)',
		padding: 2,
		paddingLeft: 5,
		top: 41,
		left: 20,
		fontWeight: 'bold',
		width: width/2
	}
});

AppRegistry.registerComponent('SplashWalls', () => SplashWalls);
