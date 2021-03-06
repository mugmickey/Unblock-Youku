/*
 * Let you smoothly surf on many websites blocking non-mainland visitors.
 * Copyright (C) 2012 Bo Zhu http://zhuzhu.org
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */


// ====== Constant and Variable Settings ======
var unblock_youku = unblock_youku || {};  // namespace

unblock_youku.default_server = 'www.yōukù.com/proxy.php';  // default backend server for redirect mode

unblock_youku.normal_url_list = unblock_youku.url_list.concat([
    //'http://shop.xunlei.com/*',
    'http://live.video.sina.com.cn/room/*',
    'http://music.baidu.com/data/music/songlink*',
    'http://music.baidu.com/data/music/songinfo*',
    'http://music.baidu.com/song/*/download*',
    'http://www.songtaste.com/*',
    'http://songtaste.com/*',
    'http://*.gougou.com/*',
    'http://www.yyets.com/*',
    'http://pay.youku.com/buy/redirect.html*',
    'http://v.pptv.com/show/*.html',
    'http://music.baidu.com/box*'
]);
unblock_youku.redirect_url_list = unblock_youku.url_list;
unblock_youku.header_extra_url_list = [
    'http://*.xiami.com/*',  // xiami is blocked in HK and TW
    'http://*.ku6.com/*'
];

unblock_youku.ip_addr = new_random_ip();
console.log('ip addr: ' + unblock_youku.ip_addr);
unblock_youku.sogou_auth = new_sogou_auth_str();
console.log('sogou_auth: ' + unblock_youku.sogou_auth);

(function () {
    var xhr = new XMLHttpRequest();
    var url = chrome.extension.getURL('manifest.json');
    xhr.open('GET', url, false);  // blocking
    xhr.send();

    var manifest = JSON.parse(xhr.responseText);
    unblock_youku.version = manifest.version;
    console.log('version: ' + unblock_youku.version);
})();


// ====== Configuration Functions ======
function get_mode_name(callback) {
    if (typeof callback === 'undefined') {
        console.error('missing callback function in get_mode_name()');
    }

    get_storage('unblock_youku_mode', function(current_mode) {
        if (typeof current_mode === 'undefined' || (
                current_mode !== 'lite'    &&
                current_mode !== 'normal'  &&
                current_mode !== 'redirect')) {
            set_mode_name('normal', function() {
                callback('normal');
            });
        } else {
            callback(current_mode);
        }
    });
}

function set_mode_name(mode_name, callback) {
    if (typeof callback === 'undefined') {
        console.error('missing callback function in set_mode_name()');
    }

    if (mode_name === 'lite' || mode_name === 'redirect') {
        set_storage('unblock_youku_mode', mode_name, callback);
    } else {
        set_storage('unblock_youku_mode', 'normal', callback);
    }
}

function clear_mode_settings(mode_name) {
    switch (mode_name) {
    case 'lite':
        clear_lite_header();
        console.log('cleared settings for lite');
        break;
    case 'redirect':
        clear_redirect();
        console.log('cleared settings for redirect');
        break;
    case 'normal':
        clear_proxy();
        clear_normal_header();
        console.log('cleared settings for normal');
        break;
    default:
        console.error('should never come here');
        break;
    }

    console.log('cleared the settings for the mode: ' + mode_name);
}

function setup_mode_settings(mode_name) {
    switch (mode_name) {
    case 'lite':
        setup_lite_header();
        break;
    case 'redirect':
        setup_redirect();
        break;
    case 'normal':
        setup_normal_header();
        setup_proxy();
        break;
    default:
        console.error('should never come here');
        break;
    }

    console.log('initialized the settings for the mode: ' + mode_name);
}

function change_mode(new_mode_name) {
    set_mode_name(new_mode_name, function() {});
    // the storage change listener would take care about the setting changes
}

// in case settings are changed (or synced) in background
chrome.storage.onChanged.addListener(function(changes, area) {
    if (typeof changes.unblock_youku_mode !== 'undefined') {
        var mode_change = changes.unblock_youku_mode;

        // doesn't run if it's first time to migrate the old settings
        if (typeof mode_change.oldValue !== 'undefined' && typeof mode_change.newValue !== 'undefined') {
            clear_mode_settings(mode_change.oldValue);
            setup_mode_settings(mode_change.newValue);
            _gaq.push(['_trackEvent', 'Change Mode', mode_change.oldValue + ' -> ' + mode_change.newValue]);
        }
    }

    if (typeof changes.custom_server !== 'undefined') {
        var server_change = changes.custom_server;
        
        if (typeof server_change.newValue !== 'undefined') {
            // have to use a localStorage cache for using in the blocking webRequest listener
            localStorage.custom_server = server_change.newValue;
        }
    }
});


// ====== Initialization ======
document.addEventListener("DOMContentLoaded", function() {
    get_mode_name(function(current_mode_name) {
        setup_mode_settings(current_mode_name);

        _gaq.push(['_trackEvent', 'Init Mode', current_mode_name]);
        _gaq.push(['_trackEvent', 'Version', unblock_youku.version]);
    });
});

