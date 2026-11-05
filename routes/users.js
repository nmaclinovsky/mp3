var User = require('../models/user');
var mongoose = require('mongoose');
var Task = require('../models/task');

module.exports = function(router){
    router.get('/users', async function(req,res){
        try{
            var where = {};

            if(req.query.where !== undefined){
                try{
                    where = JSON.parse(req.query.where);
                }catch(err){
                    return res.status(400).json({
                        message:"Invalid where parameter",
                        data:null
                    });
                }

                if(where === null || typeof where !== 'object' || Array.isArray(where)){
                    return res.status(400).json({
                        message: "Invalid where parameter",
                        data: null
                    });
                }
            }

            var sort = {};

            if(req.query.sort !== undefined){
                try{
                    sort = JSON.parse(req.query.sort);
                }catch(err){
                    return res.status(400).json({
                        message:"Invalid sort parameter",
                        data:null
                    });
                }

                if(sort === null || typeof sort !== 'object' || Array.isArray(sort)){
                    return res.status(400).json({
                        message: "Invalid sort parameter",
                        data:null
                    });
                }
            }

            var select = {};

            if(req.query.select !== undefined){
                try{
                    select = JSON.parse(req.query.select);
                }catch(err){
                    return res.status(400).json({
                        message:"Invalid select parameter",
                        data: null
                    });
                }

                if(select === null || typeof select !== 'object' || Array.isArray(select)){
                    return res.status(400).json({
                        message: "Invalid select parameter",
                        data:null
                    });
                }
            }

            var skip = 0;

            if(req.query.skip !== undefined){
                try{
                    skip = JSON.parse(req.query.skip);
                }catch(err){
                    return res.status(400).json({
                        message:"Invalid skip parameter",
                        data:null
                    });
                }

                if(!Number.isInteger(skip) || skip < 0){
                    return res.status(400).json({
                        message: "Invalid skip parameter",
                        data:null
                    });
                }
            }

            var limit = 0;

            if(req.query.limit !== undefined){
                try{
                    limit = JSON.parse(req.query.limit);
                }catch(err){
                    return res.status(400).json({
                        message:"Invalid limit parameter",
                        data:null
                    });
                }

                if(!Number.isInteger(limit) || limit < 0){
                    return res.status(400).json({
                        message: "Invalid limit parameter",
                        data:null
                    });
                }
            }

            var count = false;

            if(req.query.count !== undefined){
                try{
                    count = JSON.parse(req.query.count);
                }catch(err){
                    return res.status(400).json({
                        message:"Invalid count parameter",
                        data:null
                    });
                }

                if(typeof count !== 'boolean'){
                    return res.status(400).json({
                        message: "Invalid count parameter",
                        data:null
                    });
                }
            }

            if(count){
                var total = await User.countDocuments(where);

                return res.status(200).json({
                    message:"OK",
                    data: total
                });
            }

            var users = await User.find(where).sort(sort).select(select).skip(skip).limit(limit);

            res.status(200).json({
                message: "OK",
                data:users
            });

        }catch(err){
            res.status(500).json({
                message:"Error retrieving users",
                data:null
            });
        }
    });


    router.post('/users', async function(req,res){
        try{
            if(typeof req.body.name !== 'string' ||
                !req.body.name.trim() ||
                typeof req.body.email !== 'string' ||
                !req.body.email.trim()){
                return res.status(400).json({
                    message:"Name and email are required",
                    data:null
                });
            }

            if(req.body.pendingTasks !== undefined &&
                !Array.isArray(req.body.pendingTasks)){
                return res.status(400).json({
                    message:"Invalid pending tasks",
                    data:null
                });
            }

            var pendingTasks = req.body.pendingTasks === undefined ? [] : req.body.pendingTasks;

            for(var id of pendingTasks){
                if(typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)){
                    return res.status(400).json({
                        message:"Invalid pending task ID",
                        data:null
                    });
                }
            }

            pendingTasks = [...new Set(pendingTasks.map(id => new mongoose.Types.ObjectId(id).toString()))];

            var existing = await User.findOne({email:req.body.email});

            if(existing){
                return res.status(400).json({
                    message:"Email already exists",
                    data:null
                });
            }

            var tasks = await Task.find({_id:{$in:pendingTasks}});

            if(tasks.length !== pendingTasks.length){
                return res.status(404).json({
                    message:"Pending task not found",
                    data:null
                });
            }

            if(tasks.some(task => task.completed)){
                return res.status(400).json({
                    message:"Completed tasks cannot be pending",
                    data:null
                });
            }

            var user = new User({
                name:req.body.name,
                email:req.body.email,
                pendingTasks:pendingTasks
            });

            await user.save();

            if(pendingTasks.length > 0){
                await User.updateMany(
                    {_id:{$ne:user._id},pendingTasks:{$in:pendingTasks}},
                    {$pull:{pendingTasks:{$in:pendingTasks}}}
                );

                await Task.updateMany(
                    {_id:{$in:pendingTasks}},
                    {$set:{
                        assignedUser:user._id.toString(),
                        assignedUserName:user.name
                    }}
                );
            }

            res.status(201).json({
                message:"User created successfully",
                data:user
            });

        }catch(err){
            if(err.code === 11000){
                return res.status(400).json({
                    message:"Email already exists",
                    data:null
                });
            }

            if(err.name === 'ValidationError' || err.name === 'CastError'){
                return res.status(400).json({
                    message:"Invalid user information",
                    data:null
                });
            }

            res.status(500).json({
                message:"Error creating user",
                data:null
            });
        }
    });


    router.get('/users/:id', async function (req, res){
        try{
            if(!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(404).json({
                message: "User not found",data: null
            });
        }


        var select = {};

        if(req.query.select !== undefined){
            try{
                select = JSON.parse(req.query.select);
            }catch(err){
                return res.status(400).json({
                    message:"Invalid select parameter",
                    data:null
                });
            }

            if(select === null || typeof select !== 'object' || Array.isArray(select)){
                return res.status(400).json({
                    message:"Invalid select parameter",
                    data:null
                });
            }
        }

        var user = await User.findById(req.params.id).select(select);

        if(!user){
            return res.status(404).json({
                message: "User not found",
                data: null
            });
        }

        res.status(200).json({message: "OK",data: user});
        }

        catch(err){
            res.status(500).json({message:"Error retrieving user", data: null});

        }
    });

    router.put('/users/:id', async function(req,res){
        try{
            if(!mongoose.Types.ObjectId.isValid(req.params.id)){
                return res.status(404).json({
                    message:"User not found",
                    data:null
                });
            }

            var user = await User.findById(req.params.id);

            if(!user){
                return res.status(404).json({
                    message:"User not found",
                    data:null
                });
            }

            if(typeof req.body.name !== 'string' ||
                !req.body.name.trim() ||
                typeof req.body.email !== 'string' ||
                !req.body.email.trim()){
                return res.status(400).json({
                    message:"Name and email are required",
                    data:null
                });
            }

            if(req.body.pendingTasks !== undefined &&
                !Array.isArray(req.body.pendingTasks)){
                return res.status(400).json({
                    message:"Invalid pending tasks",
                    data:null
                });
            }

            var pendingTasks = req.body.pendingTasks === undefined ? [] : req.body.pendingTasks;

            for(var id of pendingTasks){
                if(typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)){
                    return res.status(400).json({
                        message:"Invalid pending task ID",
                        data:null
                    });
                }
            }

            pendingTasks = [...new Set(pendingTasks.map(id => new mongoose.Types.ObjectId(id).toString()))];

            var existing = await User.findOne({
                email:req.body.email,
                _id:{$ne:user._id}
            });

            if(existing){
                return res.status(400).json({
                    message:"Email already exists",
                    data:null
                });
            }

            var tasks = await Task.find({_id:{$in:pendingTasks}});

            if(tasks.length !== pendingTasks.length){
                return res.status(404).json({
                    message:"Pending task not found",
                    data:null
                });
            }

            if(tasks.some(task => task.completed)){
                return res.status(400).json({
                    message:"Completed tasks cannot be pending",
                    data:null
                });
            }

            var userId = user._id.toString();

            await Task.updateMany(
                {
                    assignedUser:userId,
                    completed:false,
                    _id:{$nin:pendingTasks}
                },
                {
                    $set:{
                        assignedUser:"",
                        assignedUserName:"unassigned"
                    }
                }
            );

            if(pendingTasks.length > 0){
                await User.updateMany(
                    {
                        _id:{$ne:user._id},
                        pendingTasks:{$in:pendingTasks}
                    },
                    {
                        $pull:{pendingTasks:{$in:pendingTasks}}
                    }
                );

                await Task.updateMany(
                    {_id:{$in:pendingTasks}},
                    {
                        $set:{
                            assignedUser:userId,
                            assignedUserName:req.body.name
                        }
                    }
                );
            }

            await Task.updateMany(
                {assignedUser:userId},
                {$set:{assignedUserName:req.body.name}}
            );

            user.name = req.body.name;
            user.email = req.body.email;
            user.pendingTasks = pendingTasks;

            await user.save();

            res.status(200).json({
                message:"User updated successfully",
                data:user
            });

        }catch(err){
            if(err.code === 11000){
                return res.status(400).json({
                    message:"Email already exists",
                    data:null
                });
            }

            if(err.name === 'ValidationError' || err.name === 'CastError'){
                return res.status(400).json({
                    message:"Invalid user information",
                    data:null
                });
            }

            res.status(500).json({
                message:"Error updating user",
                data:null
            });
        }
    });

    router.delete('/users/:id', async function(req,res){
        try {
            if(!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(404).json({
                    message: "User not found",
                    data: null
                });
            }

            var user = await User.findById(req.params.id);

            if(!user) {
                return res.status(404).json({
                    message: "User not found",
                    data: null
                });
            }

            await Task.updateMany(
                { assignedUser: req.params.id },
                { $set: { assignedUser: "", assignedUserName: "unassigned" } }
            );

            await user.deleteOne();

            res.status(200).json({
                message: "User deleted successfully",
                data: user
            });

        }
        catch(err){
            res.status(500).json({
                message: "Error deleting user",
                data: null});
        }
    });





    return router;
};