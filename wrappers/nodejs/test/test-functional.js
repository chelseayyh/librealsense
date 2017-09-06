/* License: Apache 2.0. See LICENSE file in root directory.
   Copyright(c) 2015 Intel Corporation. All Rights Reserved. */

'use strict';

const assert = require('assert');
const rs2 = require('../index.js');

describe('Pipeline tests', function() {
  it('Default pipeline', () => {
    const pipe = new rs2.Pipeline();
    pipe.start();
    const frames = pipe.waitForFrames();
    assert.equal(frames.size>0, true);
    pipe.stop();
    pipe.destroy();
  });
  it('Pipeline with context', () => {
    const ctx = new rs2.Context();
    const pipe = new rs2.Pipeline(ctx);
    pipe.start();
    const frames = pipe.waitForFrames();
    assert.equal(frames.size>0, true);
    pipe.stop();
    pipe.destroy();
  });
});

describe('Frameset test', function() {
  let pipe;
  let frameset;
  before(function() {
    pipe = new rs2.Pipeline();
    pipe.start();
    frameset = pipe.waitForFrames();
  });

  after(function() {
    frameset.destroy();
    pipe.stop();
    pipe.destroy();
  });
  it('depthFrame test', () => {
    if(frameset.depthFrame) {
      assert.equal(frameset.depthFrame instanceof rs2.DepthFrame, true);
      frameset.depthFrame.destroy();
    }
  });
  it('colorFrame test', () => {
    if(frameset.colorFrame) {
      assert.equal(frameset.colorFrame instanceof rs2.VideoFrame, true);
      frameset.colorFrame.destroy();
    }
  });
  it('at test', () => {
    for(let i=0; i<frameset.size; i++) {
      let frame = frameset.at(i);
      assert.equal(frame instanceof rs2.Frame, true);
      frame.destroy();
    }
  });
  it('getFrame test', () => {
    let color = frameset.getFrame(rs2.stream.STREAM_COLOR);
    let depth = frameset.getFrame(rs2.stream.STREAM_DEPTH);
    if (color) {
      assert.equal(color instanceof rs2.VideoFrame, true);
      color.destroy();
    }
    if (depth) {
      assert.equal(depth instanceof rs2.DepthFrame, true);
      depth.destroy();
    }
  });
});

describe('Frame test', function() {
  let pipe = undefined;
  let frameset = undefined;
  let color = undefined;
  let depth = undefined;
  before(function() {
    pipe = new rs2.Pipeline();
    pipe.start();
    frameset = pipe.waitForFrames();
    color = frameset.colorFrame;
    depth = frameset.depthFrame;
  });

  after(function() {
    if (color)
      color.destroy();
    if (depth)
      depth.destroy();
    frameset.destroy();
    pipe.stop();
    pipe.destroy();
    pipe = undefined;
    frameset = undefined;
    color = undefined;
    depth = undefined;
  });
  it('format/stream/width/height/frameNumber/timestamp/isValid test', () => {
    if(depth) {
      assert.equal(depth.format, rs2.format.FORMAT_Z16);
      assert.equal(depth.streamType, rs2.format.STREAM_DEPTH);
      assert.equal(depth.isValid, true);
      assert.equal(depth.timestamp > 0, true);
      assert.equal(depth.frameNumber > 0, true);
      assert.equal(depth.width > 0, true);
      assert.equal(depth.height > 0, true);
    }
    if(color) {
      assert.equal(color.format, rs2.format.FORMAT_RGB8);
      assert.equal(color.streamType, rs2.format.STREAM_COLOR);
      assert.equal(color.isValid, true);
      assert.equal(color.timestamp > 0, true);
      assert.equal(color.frameNumber > 0, true);
      assert.equal(color.width > 0, true);
      assert.equal(color.height > 0, true);
    }
  });
  it('frame metadata test', () => {
    for (let i=0; i<rs2.frame_metadata.FRAME_METADATA_COUNT; i++) {
      if (depth && depth.supportsFrameMetadata(i)) {
        assert.equal(depth.frameMetadata(i) != undefined, true);
      }
      if (color && color.supportsFrameMetadata(i)) {
        assert.equal(color.frameMetadata(i) != undefined, true);
      }
    }
  });
  it('frame data test', () => {
    if (depth) {
      assert.equal(depth.data.length*2, depth.dataByteLength);
    }
    if (color) {
      assert.equal(color.data.length, color.dataByteLength);
    }
  });
  it('strideInBytes test', () => {
    if (depth) {
      assert.equal(depth.strideInBytes, depth.width*2);
    }
    if (color) {
      assert.equal(color.strideInBytes, color.width*3);
    }
  });
  it('getData test', () => {
    if (depth) {
      const buf1 = new Buffer(depth.dataByteLength);
      let buf2 = depth.getData(buf1);
      const buf3 = Buffer.from(depth.data.buffer);
      assert.equal(buf3.equals(buf1), true);
      assert.equal(buf3.equals(buf2), true);
    }
    if (color) {
      const buf1 = new Buffer(color.dataByteLength);
      let buf2 = color.getData(buf1);
      const buf3 = Buffer.from(color.data.buffer);
      assert.equal(buf3.equals(buf1), true);
      assert.equal(buf3.equals(buf2), true);
    }
  });
});

describe('Colorizer test', function() {
  let pipe = undefined;
  let frameset = undefined;
  let color = undefined;
  let depth = undefined;
  let colorizer = undefined;
  before(function() {
    pipe = new rs2.Pipeline();
    pipe.start();
    frameset = pipe.waitForFrames();
    color = frameset.colorFrame;
    depth = frameset.depthFrame;
    colorizer = new rs2.Colorizer();
  });

  after(function() {
    if (color)
      color.destroy();
    if (depth)
      depth.destroy();
    frameset.destroy();
    pipe.stop();
    pipe.destroy();
    colorizer.destroy();
    pipe = undefined;
    frameset = undefined;
    color = undefined;
    depth = undefined;
    colorizer = undefined;
  });
  it('colorize test', () => {
    if(depth) {
      const depthRGB = colorizer.colorize(depth);
      assert.equal(depthRGB.height, depth.height);
      assert.equal(depthRGB.width, depth.width);
      assert.equal(depthRGB.format, rs2.format.FORMAT_RGB8);
    }
  });
});


describe('Pointcloud and Points test', function() {
  let pipe = undefined;
  let frameset = undefined;
  let color = undefined;
  let depth = undefined;
  let pc = undefined;
  let ctx = undefined;
  before(function() {
    ctx = new rs2.Context();
    pc = ctx.createPointcloud();
    pipe = new rs2.Pipeline(ctx);
    pipe.start();
    frameset = pipe.waitForFrames();
    while(frameset.size != 2) {
      frameset.destroy();
      frameset = pipe.waitForFrames();
    }
    color = frameset.colorFrame;
    depth = frameset.depthFrame;
  });

  after(function() {
    if (color)
      color.destroy();
    if (depth)
      depth.destroy();
    frameset.destroy();
    pipe.stop();
    pipe.destroy();
    pc.destroy();
    ctx.destroy();
    pc = undefined;
    ctx = undefined;
    pipe = undefined;
    frameset = undefined;
    color = undefined;
    depth = undefined;
  });
  it('map and calculate test', () => {
    assert.equal(pc instanceof rs2.Pointcloud, true);

    pc.mapTo(color);
    const points = pc.calculate(depth);
    const cnt = depth.width*depth.height;
    assert.equal(points instanceof rs2.Points, true);
    assert.equal(points.size, cnt);
    const vertices = points.getVertices();
    const texCoordinates = points.getTextureCoordinates();

    assert.equal(vertices instanceof Float32Array, true);
    assert.equal(texCoordinates instanceof Int32Array, true);

    assert.equal(vertices.length, cnt*3);
    assert.equal(texCoordinates.length, cnt*2);
  });
});

describe('Context tests', function() {
  let ctx = undefined;
  before(() => {
    ctx = new rs2.Context();
  });
  after(() => {
    ctx.destroy();
  });
  it('Query devices', () => {
    const devs = ctx.queryDevices();

    assert.equal(devs.length, 1);
    assert.equal(devs[0] instanceof rs2.Device, true);
    devs.forEach((dev) => {
      dev.destroy();
    });
  });
  it('Query sensors', () => {
    const sensors = ctx.querySensors();

    assert.equal(sensors.length, 2);
    assert.equal(sensors[0] instanceof rs2.Sensor, true);
    assert.equal(sensors[1] instanceof rs2.Sensor, true);
    sensors.forEach((sensor) => {
      sensor.destroy();
    });
  });
});

describe('Sensor tests', function() {
  let ctx = undefined;
  let sensors = undefined;
  before(() => {
    ctx = new rs2.Context();
    sensors = ctx.querySensors();
  });
  after(() => {
    ctx.destroy();
    sensors.forEach((sensor) => {
      sensor.destroy();
    })
    ctx = undefined;
    sensors = undefined;
  });
  it('Stream profiles', () => {
    const profiles0 = sensors[0].getStreamProfiles();
    const profiles1 = sensors[1].getStreamProfiles();

    assert.equal(profiles1.length>0, true);
    assert.equal(profiles0.length>0, true);
    profiles0.forEach((p) => {
      assert.equal(p instanceof rs2.StreamProfile, true);
      assert.equal(p instanceof rs2.StreamProfile, true);
      assert.equal(p.streamType >= rs2.stream.STREAM_DEPTH && p.streamType < rs2.stream.STREAM_COUNT, true);
      assert.equal(p.format >= rs2.format.FORMAT_Z16 && p.format < rs2.format.FORMAT_COUNT, true);
      assert.equal(p.fps>0, true);
      assert.equal(typeof p.uniqueID, 'number');
      assert.equal(typeof p.isDefault, 'boolean');
      assert.equal(typeof p.size, 'number');
    });
    profiles1.forEach((p) => {
      assert.equal(p instanceof rs2.StreamProfile, true);
      assert.equal(p instanceof rs2.StreamProfile, true);
    });
  });
  it.skip('Open and start', () => {
    this.timeout(5000);
    return new Promise((resolve, reject) => {
      const profiles0 = sensors[0].getStreamProfiles();
      sensors[0].open(profiles0[1]);
      sensors[0].start((frame) => {
        assert.equal(frame instanceof rs2.Frame, true);
        resolve();
      });
    });
  });
});
