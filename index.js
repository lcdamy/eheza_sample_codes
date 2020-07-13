var Organization    = require('../models/organization').Organization;
var audit           = require('../utils/audit-log');
var log             = require('../utils/log');
var mail            = require('../utils/mail');
var crypto          = require('crypto');
var formidable      = require("formidable");
var dictionary      = require('../utils/dictionary');
var fs              = require('fs');

// API
exports.api = {};

var controllers = {
    configuration: require('./configuration')
};

exports.api.create = function(req, res) {
    var server = controllers.configuration.getConf().server;
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        if(err){
            log.error(err);
            audit.logEvent('[formidable]', 'Organizations', 'Create', "", "", 'failed', "Formidable attempted to parse organization fields");
            return res.status(500).send(err);
        } else {
            if (fields.json) {
                fields = JSON.parse(fields.json);
            }
            var email = fields.email || '';
            var name = fields.name || '';
            var address = fields.address || '';
            var description = fields.description || '';
            var userID = fields.userID || '';
            var phoneNumber = fields.phoneNumber || '';
            var website = fields.website || '';
            if (email === '' || name === '' || address === '' || description === '') {
                audit.logEvent('Organizations', 'Create', '', '', 'failed','The actor could not create an organization because one or more params of the request was not correct');
                return res.sendStatus(400);
            } else {
                var organization = new Organization();
                organization.email = email;
                organization.name = name;
                organization.address = address;
                organization.description = description;

                organization.userID = userID;
                organization.phoneNumber = phoneNumber;
                organization.website = website;

                var file = files.file;
                if (file && file.path) {
                    fields.picture = {
                        data: fs.readFileSync(file.path),
                        contentType: file.type
                    }
                    organization.picture = fields.picture;
                }

                organization.save(organization, function(err) {
                    if (err) {
                        log.error(err);
                        audit.logEvent('[mongodb]', 'Organizations', 'Create', "email", email, 'failed', "Mongodb attempted to save a new organization");
                        return res.status(500).send(err);
                    } else {
                        return res.send(organization._id);
                    }
                });
            }
        }
    });
};

exports.api.upsert = function(req, res) {
    var server = controllers.configuration.getConf().server;
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        if(err){
            log.error(err);
            audit.logEvent('[formidable]', 'Organizations', 'Create', "", "", 'failed', "Formidable attempted to parse organization fields");
            return res.status(500).send(err);
        } else {
            if (fields.json) {
                fields = JSON.parse(fields.json);
            }
            var email = fields.email || '';
            var name = fields.name || '';
            var address = fields.address || '';
            var description = fields.description || '';
            if (email === '' || name === '' || address === '' || description === '') {
                audit.logEvent('Organizations', 'Create', '', '', 'failed','The actor could not create an organization because one or more params of the request was not correct');
                return res.sendStatus(400);
            } else {
                var file = files.file;
                if (file && file.path) {
                    fields.picture = {
                        data: fs.readFileSync(file.path),
                        contentType: file.type
                    }
                    var organizationPicture = fields.picture || '';
                }
                if (fields._id !== undefined)
                        var filter = fields._id ? {_id: fields._id} : {name: fields.name, email: fields.email, address: fields.address, description: fields.description, phoneNumber: fields.phoneNumber, website:fields.website, picture:fields.picture };
                else
                        var filter = fields.name ? {name: fields.name} : {email: fields.email, address: fields.address, description: fields.description, phoneNumber: fields.phoneNumber, website:fields.website, picture:fields.picture };
                
                var organizationCreate = fields.creationDate || '';
                var organizationlastView  = fields.lastView || '';
                Organization.findOneAndUpdate(filter,  {$set:{"name": fields.name, "email": fields.email, "address": fields.address,
                                                              "description": fields.description, "phoneNumber": fields.phoneNumber, 
                                                              "website":fields.website, "picture":organizationPicture,"userID":fields.userID,
                                                               "status":fields.status, "creationDate":organizationCreate, "lastView":organizationlastView}
                                                           },
                                                               {upsert:true}, 
                                                              function(err, result) {
                            if (err) {
                                log.error(err);
                                audit.logEvent('[mongodb]', 'Organizations', 'Upserted', "email", email, 'failed', "Mongodb attempted to save a new organization");
                                return res.status(500).send(err);
                            } else {
                                return res.json(result);
                            }
                    });
            }
        }
    });
};

exports.api.updateLastView = function(req, res) {
    var organizationID = req.params.id;
    Organization.findOneAndUpdate({_id : organizationID},{lastView: Date.now()}, function(err,result){
        if (err) {
            log.error(err);
            audit.logEvent('[mongodb]', 'Organizations', 'updateLastView', '', '', 'failed', 'Mongodb attempted to update the last View');
            return res.status(500).send(err);
        } else {
            res.sendStatus(200);
        }
    });
};

exports.api.list = function(req, res) {
    Organization.find({},null,{sort: {lastView: -1}},function (err, organizations) {
        if (err) {
            log.error(err);
            audit.logEvent('[mongodb]', 'Organizations', 'List', '', '', 'failed', 'Mongodb attempted to retrieve organizations list');
            return res.status(500).send(err);
        } else {
            for(i=0;i<organizations.length;i++){
                if(organizations[i].picture && organizations[i].picture.data){
                    organizations[i].picture.data = organizations[i].picture.data.toString('base64');
                }
            }
            return res.json(organizations);
        }
    });
};

exports.api.read = function(req, res) {
    if (req.params.id == undefined) {
        audit.logEvent(req.actor.id, 'Organizations', 'Read', '', '', 'failed','The actor could not read the Organization because one or more params of the request was not defined');
        return res.sendStatus(400);
    } else {
        Organization.findOne({_id : req.params.id}, function (err, organization) {
            if (err) {
                log.error(err);
                audit.logEvent('[mongodb]', 'Organizations', 'Read', '', '', 'failed', 'Mongodb attempted to read an organization');
                return res.status(500).send(err);
            } else if(organization === null) {
                return res.status(500).send(err);
            } else {
                if(organization.picture && organization.picture.data){
                    organization.picture.data = organization.picture.data.toString('base64');
                }
                return res.json(organization);
            }
        });
    }
    
};

exports.api.listByUser = function(req, res) {
    var userID = req.params.userID;
    if (req.params.userID == undefined) {
        audit.logEvent(req.actor.id, 'Organizations', 'Read', '', '', 'failed','The actor could not read the Organizations list because one or more params of the request was not defined');
        return res.sendStatus(400);
    } else {
        Organization.find({userID: userID
        }, function (err, organizations) {
            if (err) {
                log.error(err);
                audit.logEvent('[mongodb]', 'Organizations', 'List', '', '', 'failed', 'Mongodb attempted to retrieve Organization list');
                return res.status(500).send(err);
            } else {
                return res.json(organizations);
            }
        });
    }
};

exports.api.manageOrganizations = function(req, res) {
    //send push notification
    Organization.findOneAndUpdate({"_id": req.params.id}, {"status": req.params.status}, {upsert:true}, function (err, result){
        if (err) {
            log.error(err);
            audit.logEvent('[mongodb]', 'Organizations', 'Update', "actor", req.actor.id, 'failed', "Mongodb attempted to findOneAndUpdate a organization");
            return res.status(500).send(err);
        } else {
            return res.sendStatus(200);
        }
    });
};