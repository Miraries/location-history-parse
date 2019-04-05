const geolib = require('geolib');
const StreamArray = require('stream-json/utils/StreamArray');
const path = require('path');
const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));
const Transform = require('stream').Transform;

class Transformer extends Transform {
    constructor(firstLine) {
        super();
        this._removed = false;
        this._fl = firstLine;
    }
    _transform(chunk, encoding, done) {
        if (this._removed)
            this.push(chunk);
        else {
            const buff = chunk.toString();
            const index = buff.indexOf(this._fl ? 'locations' : '\n}');
            if (index !== -1) {
                this.push(this._fl ? buff.slice(index + 13) : buff.slice(0, index));
                this._removed = true;
            } else this.push(chunk);
        }
        done();
    }
}

const searchFile = function(fileName, latitude, longitude, radius) {
    const centerCity = { latitude, longitude };
    const jsonStream = StreamArray.make();
    const dates = [];

    jsonStream.output.on('data', ({ value: { latitudeE7, longitudeE7, timestampMs } }) => {
    	const searchCity = { latitude: latitudeE7 / 1e7, longitude: longitudeE7 / 1e7 };
        if (geolib.isPointInCircle(searchCity, centerCity, radius)) {
            const date = Math.trunc(timestampMs / 1e8);
            if (dates.includes(date))
                return;
            console.log(new Date(+timestampMs).toUTCString());
            dates.push(date);
        }
    });

    fs.createReadStream(fileName)
    	.pipe(new Transformer(true))
    	.pipe(new Transformer())
    	.pipe(jsonStream.input);
}

if (argv._[0] === 'search')
    searchFile(argv._[1], argv.lat, argv.lon, argv.radius);
else
    throw Error('Invalid arguments');