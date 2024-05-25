const express = require('express');
const Next_Action_Router = express.Router();
module.exports = Next_Action_Router;

let client = require(`./database.js`)

Next_Action_Router.get('/next_action', async (req, res) => {

    if(req.body.action == "attack") {

        let player = await client.db('ds_db').collection('stats').findOne(
            playerId = req.body.name
        )

        console.log(player)
        //attack action cukup tak?
        //enemy health utk tolak



        if(player.attack_action > 0) {
            console.log("attack")

            let result = await client.db('ds_db').collection('stats').updateOne(
                {playerId : player.playerId},
                { $inc: {enemy_current_health: -2, attack_action: -1} }
            )

            console.log(result)

        } else {
            console.log("Cannot attack")
        }

    } else if(req.body.action == "evade") {
        let player = await client.db('ds_db').collection('stats').findOne(
            playerId = req.body.name
        )

        console.log(player)
        //attack action cukup tak?
        //enemy health utk tolak

        if(player.evade_action > 0) {
            console.log("evade")

            let result = await client.db('ds_db').collection('stats').updateOne(
                {playerId : player.playerId},
                { $inc: {evade_action: -1} }
            )

        } else {
            console.log("Cannot evade")
        }
    } else if(req.body.action == "defend") {
        let player = await client.db('ds_db').collection('stats').findOne(
            playerId = req.body.name
        )

        console.log(player)
        //attack action cukup tak?
        //enemy health utk tolak
        console.log("defend")
    } else {
        res.send("Invalid Action")
    }

})