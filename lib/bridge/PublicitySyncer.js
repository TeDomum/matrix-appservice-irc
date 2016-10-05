/*eslint no-invalid-this: 0*/ // eslint doesn't understand Promise.coroutine wrapping
"use strict";
var Promise = require("bluebird");

function PublicitySyncer(ircBridge, appServiceBot) {
    this.ircBridge = ircBridge;
    this.appServiceBot = appServiceBot;

    // Cache the mode of each channel, the visibility of each room and the
    // known mappings between them. When any of these change, any inconsistencies
    // should be resolved by keeping the matrix side as private as necessary
    this._visibilityMap = {
        mappings: {
            //room_id: ['server #channel1', 'server channel2',...]
        },
        channelModes: {
            // '$server $channel': true | false
        },
        roomVisibilities: {
            // room_id: "private" | "public"
        }
    }
}

var _solveTimeout = null;

PublicitySyncer.prototype.updateVisibilityMap = function(isMode, key, value) {
    let hasChanged = false;
    if (isMode) {
        if (typeof value !== 'boolean') {
            throw new Error('+s state must be indicated with a boolean');
        }
        if (this._visibilityMap.channelModes[key] !== value) {
            this._visibilityMap.channelModes[key] = value;
            hasChanged = true;
        }
    }
    else {
        if (typeof value !== 'string' || (value !== "private" && value !== "public")) {
            throw new Error('Room visibility must = "private" | "public"');
        }

        if (this._visibilityMap.roomVisibilities[key] !== value) {
            this._visibilityMap.roomVisibilities[key] = value;
            hasChanged = true;
        }
    }

    if (hasChanged) {
        clearTimeout(_solveTimeout);

        log.info('Solving in 10s');
        _solveTimeout = setTimeout(() => {
            this._solveVisibility().catch((err) => {
                log.error(err.message);
            });
        }, 10000);
        return Promise.resolve();
    }

    return Promise.resolve();
}

PublicitySyncer.prototype._solveVisibility = Promise.coroutine(function*() {
    // For each room, do a big OR on all of the channels that are linked in any way

    this._visibilityMap.mappings = yield this.getStore().getAllMappings();

    let roomIds = Object.keys(this._visibilityMap.mappings);

    let shouldBePrivate = (roomId, checkedChannels) => {
        // If any channel connected to this room is +s, stop early and call it private

        // List first connected
        let channels = this._visibilityMap.mappings[roomId];
        //      = ['localhost #channel1', 'localhost #channel2', ... ]

        // No channels mapped to this roomId
        if (!channels) {
            return false;
        }

        // Filter out already checked channels
        channels = channels.filter((c) => checkedChannels.indexOf(c) === -1);

        let anyAreSecret = channels.some((channel) => {
            let channelIsSecret = this._visibilityMap.channelModes[channel];

            // If a channel mode is unknown, assume it is secret
            if (typeof channelIsSecret === 'undefined') {
                log.info('Assuming channel ' + channel + ' is secret');
                channelIsSecret = true;
            }

            return channelIsSecret;
        });
        if (anyAreSecret) {
            return true;
        }

        // Otherwise, recurse with the rooms connected to each channel

        // So get all the roomIds that this channel is mapped to and return whether any
        //  are mapped to channels that are secret
        return channels.map((channel) => {
            return Object.keys(this._visibilityMap.mappings).filter((roomId2) => {
                return this._visibilityMap.mappings[roomId2].indexOf(channel) !== -1;
            });
        }).some((roomIds2) => {
            return roomIds2.some((roomId2) => {
                return shouldBePrivate(roomId2, checkedChannels.concat(channels));
            });
        });
    }

    let roomCorrectVisibilities = roomIds.map(
        (roomId) => {
            return shouldBePrivate(roomId, []);
        }
    ).map((b) => b ? 'private' : 'public');

    let cli = this.appServiceBot;

    // Update rooms to correct visibilities
    let promises = roomIds.map((roomId, index) => {
        let currentState = this._visibilityMap.roomVisibilities[roomId];
        let correctState = roomCorrectVisibilities[index];

        if (currentState !== correctState) {
            return cli.setRoomDirectoryVisibility(roomId, correctState).then(
                () => {
                    // Update cache
                    this._visibilityMap.roomVisibilities[roomId] = correctState;
                }
            ).catch((e) => console.err);
        }
    });

    return Promise.all(promises);
});