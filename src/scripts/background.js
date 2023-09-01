'use strict';


// The purpose of this assignment is to create a convenient way to check if an object has a specific property.
// we used this when we needed to checked if the updatedstorage had correct keys
//
// example of has function is
// const obj = { foo: 42, bar: 'hello' };

// if (has.call(obj, 'foo')) {
//   console.log('obj has the property "foo"');
// } else {
//   console.log('obj does not have the property "foo"');
// }
//
//
const has = Object.prototype.hasOwnProperty;

const unicodeBoundry = "[ \n\r\t!@#$%^&*()_\\-=+\\[\\]\\\\\\|;:'\",\\.\\/<>\\?`~:]+";

// just a map like struct to store all the open ports 
const ports = {};
// flag to chekc initialized storage
let initStorage = false;
let compiledStorage;
let storage = {
  filterData: {
    videoId: ['// Video ID filters', ''],
    channelId: ['// Channel ID filters', ''],
    channelName: ['// Channel name filters', ''],
    comment: ['// Comment filters', ''],
    title: ['// Video title filters', ''],
    vidLength: [null, null],
    javascript: "",
    percentWatchedHide: null
  },
  options: {
    trending: false,
    mixes: false,
    shorts: false,
    movies: false,
    suggestions_only: false,
    autoplay: false,
    enable_javascript: false,
    block_message: "",
    block_feedback: false,
    disable_db_normalize: false,
    disable_you_there: false
  },
};

// opbject whose funtion are used in below callbacks
const utils = {

  // this fucntion is some sort of data corrector, yeh data leta h accha data return krta h
  compileRegex(entriesArr, type) {
    if (!(entriesArr instanceof Array)) {
      return undefined;
    }
    // empty dataset
    if (entriesArr.length === 1 && entriesArr[0] === '') return [];

    // skip empty and comments lines
    const filtered = [...new Set(entriesArr.filter(x => !(!x || x === '' || x.startsWith('//'))))];

    return filtered.map((v) => {
      v = v.trim();

      // unique id
      if (['channelId', 'videoId'].includes(type)) {
        return [`^${v}$`, ''];
      }

      // raw regex
      const parts = /^\/(.*)\/(.*)$/.exec(v);
      if (parts !== null) {
        return [parts[1], parts[2]];
      }

      // regular keyword
      return ['(^|' + unicodeBoundry + ')(' +
        v.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&') +
        ')(' + unicodeBoundry + '|$)', 'i'];
    });
  },

  // yeh sara data in storage compile karta h
  compileAll(data) {
    const sendData = { filterData: {}, options: data.options };

    // compile regex props
    ['title', 'channelName', 'channelId', 'videoId', 'comment'].forEach((p) => {
      const dataArr = this.compileRegex(data.filterData[p], p);
      if (dataArr) {
        sendData.filterData[p] = dataArr;
      }
    });

    sendData.filterData.vidLength = data.filterData.vidLength;
    sendData.filterData.javascript = data.filterData.javascript;

    return sendData;
  },

  // yeh filters(storage me added h) ek specific port bhejta h
  sendFilters(port) {
    port.postMessage({ type: 'filtersData', data: { storage, compiledStorage } });
  },

  // yeh filters(storage me added h) ek sara ports bhejta h/ useful when the filters are updated 
  // and we have to update the filters at every port
  sendFiltersToAll() {

    // sari keyss me iterate krr rha h and keys se sare ports ko message bhej rha h, whoever are listingng 
    Object.keys(ports).forEach((p) => {
      try {
        // data sent in form of compiledStorage and storage 
        ports[p].postMessage({ type: 'filtersData', data: { storage, compiledStorage } });
      } catch (e) {
        console.error('Where are you my child?');
      }
    });
  }
};


// this part is ran when a connection request is made from any part of the extension
chrome.runtime.onConnect.addListener((port) => {
    port.onDisconnect.addListener((port) => {
        const key = port.sender.contextId || port.sender.frameId;
        // we storing the ports in a map so removing it now using its corresponding key
        delete ports[key];
    });
    // either contextid or frameid ko key banake map(posts) me store port
    const key = port.sender.contextId || port.sender.frameId;
    ports[key] = port;
    // if storage initilize ho chuki h then connection request ko data bhejdo plis
    // storage initialize when jab option page pe jakar isme id/name/etc... add krte
    if (initStorage) utils.sendFilters(port);
});


// This code retrieves data from the local storage of the Chrome extension. 
// It retrieves the storageData from the local storage and then processes the retrieved data.
chrome.storage.local.get('storageData', (data) => {
  if (data !== undefined && Object.keys(data).length > 0) {
    storage = data.storageData;
    compiledStorage = utils.compileAll(data.storageData);
  }

  chrome.storage.onChanged.addListener((changes) => {
    
    // yha (changes) is arg of callback function which have the below structure
    // 
    // {
    //   storageData: {
    //     oldValue: <previous value>,
    //     newValue: <new value>
    //   },
    //   // Other changed keys...
    // }

    // the has.call checks if the changes have the 'storageData' key 
    // 
    // to be more specific here 
    //
    // sendStorage() {
    //   window.postMessage({
    //     from: 'BLOCKTUBE_CONTENT',
    //     type: 'storageData',
    //     data: compiledStorage || globalStorage,
    //   }, document.location.origin);
    // },
    // we can see storageData here.
    //
    if (has.call(changes, 'storageData')) {

      // see the above sturct of changes
      //
      // storage global variable ki yha pe value update krr rhe h
      storage = changes.storageData.newValue;
      // iss line me compiledstorgae global ki value changed
      compiledStorage = utils.compileAll(changes.storageData.newValue);
      // sendFiltersToAll line me jo bhi port h unn sab me new storage ka data chla jata h
      utils.sendFiltersToAll();
    }
  });

  // just flag to check if storgae is initialized
  initStorage = true;
  // sendFiltersToAll line me jo bhi port h unn sab me new storage ka data chla jata h
  utils.sendFiltersToAll();
});


// I thinnk this is incomplete 
// TODO: Popup UI
chrome.browserAction.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});
