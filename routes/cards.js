const express = require('express');
const cards = express.Router();
const axios = require("axios");

cards.route('/').get(function (req, res) {
    const API_KEY = '';
    const URL_CARDS = 'https://api.clashroyale.com/v1/cards';
    let items = [];
    axios.get(URL_CARDS, {
    headers: {
        'Authorization': `Bearer ${API_KEY}`
    }
    })
    .then(response => {
        items = response.data.items;
        console.log(items);
        res.send(items);
    })
    .catch(error => {
        console.error('Erro ao fazer a requisição:', error);
    });
});

module.exports = cards;
