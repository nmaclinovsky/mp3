var Task = require('../models/task');
var mongoose = require('mongoose');
var User = require('../models/user');

module.exports = function(router){
    router.get('/tasks', async function(req,res){
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
                        data: null
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
                        data:null
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

            var limit = 100;

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
                var total = await Task.countDocuments(where);
                return res.status(200).json({
                    message:"OK",
                    data:total
                });
            }

            var tasks = await Task.find(where).sort(sort).select(select).skip(skip).limit(limit);

            res.status(200).json({
                message:"OK",
                data: tasks
            });

        }catch(err){
            res.status(500).json({
                message:"Error retrieving tasks",
                data:null
            });
        }
    });

    router.post('/tasks', async function(req,res){
        try{
            if(typeof req.body.name !== 'string' ||
                !req.body.name.trim() ||
                typeof req.body.deadline !== 'string' ||
                isNaN(Date.parse(req.body.deadline))){
                return res.status(400).json({
                    message:"Name and valid deadline are required",
                    data:null
                });
            }

            if((req.body.description !== undefined && typeof req.body.description !== 'string') ||
                (req.body.completed !== undefined && typeof req.body.completed !== 'boolean') ||
                (req.body.assignedUser !== undefined && typeof req.body.assignedUser !== 'string') ||
                (req.body.assignedUserName !== undefined && typeof req.body.assignedUserName !== 'string')){
                return res.status(400).json({
                    message:"Invalid task information",
                    data:null
                });
            }

            var assignedUser = req.body.assignedUser === undefined ? "" : req.body.assignedUser;
            var assignedUserName = "unassigned";

            if(assignedUser !== ""){
                if(!mongoose.Types.ObjectId.isValid(assignedUser)){
                    return res.status(400).json({
                        message:"Invalid assigned user",
                        data:null
                    });
                }

                var user = await User.findById(assignedUser);

                if(!user){
                    return res.status(404).json({
                        message:"Assigned user not found",
                        data:null
                    });
                }

                assignedUser = user._id.toString();
                assignedUserName = user.name;
            }

            if(req.body.assignedUserName !== undefined &&
                req.body.assignedUserName !== assignedUserName){
                return res.status(400).json({
                    message:"Invalid assigned user name",
                    data:null
                });
            }

            var task = new Task({
                name:req.body.name,
                description:req.body.description === undefined ? "" : req.body.description,
                deadline:req.body.deadline,
                completed:req.body.completed === undefined ? false : req.body.completed,
                assignedUser:assignedUser,
                assignedUserName:assignedUserName
            });

            await task.save();

            if(assignedUser !== "" && !task.completed){
                await User.updateOne(
                    {_id:assignedUser},
                    {$addToSet:{pendingTasks:task._id.toString()}}
                );
            }

            res.status(201).json({
                message:"Task created successfully",
                data:task
            });

        }
        
        catch(err){
            if(err.name === 'ValidationError' || err.name === 'CastError'){
                return res.status(400).json({
                    message:"Invalid task information",
                    data:null
                });
            }

            res.status(500).json({
                message:"Error creating task",
                data:null
            });
        }
    });

    router.get('/tasks/:id', async function(req,res){
        try {
            if(!mongoose.Types.ObjectId.isValid(req.params.id)){
                return res.status(404).json({
                    message:"Task not found",
                    data: null
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

            

            var task = await Task.findById(req.params.id).select(select);

            if(!task){
                return res.status(404).json({
                    message: "Task not found",
                    data: null
                });
            }
            res.status(200).json({
                message: "OK",
                data: task
            });} 
        
        catch(err){
            res.status(500).json({
                message: "Error retrieving task",
                data: null
            });
        }
    });

    router.put('/tasks/:id', async function(req,res){
        try{
            if(!mongoose.Types.ObjectId.isValid(req.params.id)){
                return res.status(404).json({
                    message:"Task not found",
                    data:null
                });
            }

            var task = await Task.findById(req.params.id);

            if(!task){
                return res.status(404).json({
                    message:"Task not found",
                    data:null});
            }

            if(typeof req.body.name !== 'string' ||
                !req.body.name.trim() ||
                typeof req.body.deadline !== 'string'||
                isNaN(Date.parse(req.body.deadline))){
                return res.status(400).json({
                    message:"Name and valid deadline are required",
                    data:null
                });
            }

            if((req.body.description !== undefined && typeof req.body.description !== 'string') ||
                (req.body.completed !== undefined && typeof req.body.completed !== 'boolean') ||
                (req.body.assignedUser !== undefined && typeof req.body.assignedUser !== 'string')||
                (req.body.assignedUserName !== undefined && typeof req.body.assignedUserName !== 'string')){
                return res.status(400).json({
                    message:"Invalid task information",
                    data:null
                });
            }

            var assignedUser = req.body.assignedUser === undefined ? "" : req.body.assignedUser;
            var assignedUserName = "unassigned";

            if(assignedUser !== ""){
                if(!mongoose.Types.ObjectId.isValid(assignedUser)){
                    return res.status(400).json({
                        message:"Invalid assigned user",
                        data:null
                    });
                }

                var user = await User.findById(assignedUser);

                if(!user){
                    return res.status(404).json({
                        message:"Assigned user not found",
                        data:null
                    });
                }

                assignedUser = user._id.toString();
                assignedUserName = user.name;
            }

            if(req.body.assignedUserName !== undefined &&
                req.body.assignedUserName !== assignedUserName){
                return res.status(400).json({
                    message:"Invalid assigned user name",
                    data:null
                });
            }

            var previousUser = task.assignedUser;

            task.name = req.body.name;
            task.description = req.body.description === undefined ? "" : req.body.description;
            task.deadline = req.body.deadline;
            task.completed = req.body.completed === undefined ? false : req.body.completed;
            task.assignedUser = assignedUser;
            task.assignedUserName = assignedUserName;

            await task.save();

            if(previousUser !== ""){
                await User.updateOne(
                    {_id:previousUser},
                    {$pull:{pendingTasks:task._id.toString()}}
                );
            }

            if(assignedUser !== "" && !task.completed){
                await User.updateOne(
                    {_id:assignedUser},
                    {$addToSet:{pendingTasks:task._id.toString()}}
                );
            }

            res.status(200).json({
                message:"Task updated successfully",
                data:task
            });

        }catch(err){
            if(err.name === 'ValidationError' || err.name === 'CastError'){
                return res.status(400).json({
                    message:"Invalid task information",
                    data:null
                });
            }

            res.status(500).json({
                message:"Error updating task",
                data:null
            });
        }
    });

    router.delete('/tasks/:id', async function(req,res) {
        try{
            if(!mongoose.Types.ObjectId.isValid(req.params.id)){
                return res.status(404).json({
                    message:"Task not found",
                    data: null
                });
            }

            var task = await Task.findById(req.params.id);

            if(!task){
                return res.status(404).json({
                    message: "Task not found",
                    data:null
                });
            }

            if(task.assignedUser!== ""){
                await User.updateOne(
                    {_id: task.assignedUser},
                    {$pull: {pendingTasks: task._id.toString()}}
                );
            }

            await task.deleteOne();

            res.status(200).json({
                message:"Task deleted successfully",
                data: task
            });

        }
        
        catch(err){
            res.status(500).json({
                message: "Error deleting task",
                data:null
            });
        }
    });




    return router;
};