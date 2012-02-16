/*
 * image-test.js: Test that should be common to all providers.
 *
 * (C) 2012 Nodejitsu Inc.
 *
 */

var fs          = require('fs'),
    path        = require('path'),
    vows        = require('vows'),
    assert      = require('../../helpers/assert'),
    helpers     = require('../../helpers'),
    testData    = {},
    testContext = {},
    clients     = {};

function batchOne (providerClient, providerName, nock) {
  var name   = providerName   || 'rackspace',
      client = providerClient || rackspace,
      test   = {};

  test["The pkgcloud " + name + " compute client"] = 
    {
      "the getServers() method": {
        "with no details": {
          topic: function () {
            client.getServers(this.callback);
          },
          "should return the list of servers": function (err, servers) {
            testContext.servers = servers;
            servers.forEach(function (server) {
              assert.assertServer(server);
            });
            assert.assertNock(nock);
          }
        }
      }
    };

  return test;
}

function batchTwo (providerClient, providerName, nock) {
  var name   = providerName   || 'rackspace',
      client = providerClient || rackspace,
      test   = {};

  test["The pkgcloud " + name + " compute client"] =
    {
      "the getImages() method": {
        "with no details": {
          topic: function () {
            client.getImages(this.callback);
          },
          "should return the list of images": function (err, images) {
            testContext.images = images;
            images.forEach(function (image) {
              assert.assertImage(image);
            });
            assert.assertNock(nock);
          }
        }
      }
    };

  return test;
}

function batchThree (providerClient, providerName, nock) {
  var name   = providerName   || 'rackspace',
      client = providerClient || rackspace,
      test   = {};

  test["The pkgcloud " + name + " compute client"] =
    {
      "the getImage() method providing an id": {
        topic: function () {
          client.getImage(testContext.images[0].id, this.callback);
        },
        "should return a valid image": function (err, image) {
          assert.assertImageDetails(image);
          assert.assertNock(nock);
        }
      },
      "the getImage() method providing an image": {
        topic: function () {
          client.getImage(testContext.images[0], this.callback);
        },
        "should return a valid image": function (err, image) {
          assert.assertImageDetails(image);
          assert.assertNock(nock);
        }
      }
    };

  return test;
}

JSON.parse(fs.readFileSync(__dirname + '/../../configs/providers.json'))
  .forEach(function(provider) {
    clients[provider] = helpers.createClient(provider, 'compute');
    var client = clients[provider],
        nock   = require('nock');
    if(process.env.NOCK) {
      if(provider === 'joyent') {
        nock('https://' + client.config.serversUrl)
          .get('/' + client.config.account + '/machines')
            .reply(200, "[]", {})
          .get('/' + client.config.account + '/datasets')
            .reply(200, helpers.loadFixture('joyent/images.json'), {})
          .get('/' + client.config.account +
            '/datasets/sdc%3Asdc%3Anodejitsu%3A1.0.0')
            .reply(200, helpers.loadFixture('joyent/image.json'), {})
          .get('/' + client.config.account +
            '/datasets/sdc%3Asdc%3Anodejitsu%3A1.0.0')
            .reply(200, helpers.loadFixture('joyent/image.json'), {});
      } else if(provider === 'rackspace') {
        nock('https://' + client.authUrl)
          .get('/v1.0')
          .reply(204, "", {
            'x-storage-url'         : 'https://storage101.ord1.clouddrive.com/v1/' +   
              'MossoCloudFS_9198ca47-40e2-43e4-838b-8abea03a9b41',
            'x-auth-token'          : 'eec97af1-c574-4f9f-8c1f-642fa7979023',
            'x-storage-token'       : 'eec97af1-c574-4f9f-8c1f-642fa7979023',
            'x-server-management-url': 
              'https://servers.api.rackspacecloud.com/v1.0/537645',
            'x-cdn-management-url'  : 'https://cdn2.clouddrive.com/v1/'+
              'MossoCloudFS_9198ca47-40e2-43e4-838b-8abea03a9b41' });
        nock('https://' + client.serversUrl)
          .get('/v1.0/537645/servers/detail.json')
            .reply(204, helpers.loadFixture('rackspace/servers.json'), {})
          .get('/v1.0/537645/images/detail.json')
            .reply(200, helpers.loadFixture('rackspace/images.json'), {})
          .get('/v1.0/537645/images/112')
            .reply(200, helpers.loadFixture('rackspace/image.json'), {})
          .get('/v1.0/537645/images/112')
            .reply(200, helpers.loadFixture('rackspace/image.json'), {});
      }
    }
    vows
      .describe('pkgcloud/common/compute/image [' + provider + ']')
      .addBatch(batchOne(client, provider, nock))
      .addBatch(batchTwo(client, provider, nock))
      .addBatch(batchThree(client, provider, nock))
       ["export"](module);
  });