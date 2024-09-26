import React, { useState } from 'react';
import axios from 'axios';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';
import './App.css';

function App() {
  const [cards, setCards] = useState([]);

  const getCards = () => {
    axios.get('http://localhost:3000/cards')
      .then(response => {
        setCards(response.data);
      })
      .catch(error => {
        console.error('Erro ao obter os cards:', error);
      });
  };

  return (
    <div className="App">
      <Typography variant="h4" gutterBottom>
        Clash Royale Cards
      </Typography>
      <Button variant="contained" color="primary" onClick={getCards}>
        Ver Cards
      </Button>
      <TableContainer component={Paper} style={{ marginTop: 20 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Id</TableCell>
              <TableCell>Max Level</TableCell>
              <TableCell>Rarity</TableCell>
              <TableCell>Elixir Cost</TableCell>
              <TableCell>Icon</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cards.map(card => (
              <TableRow key={card.id}>
                <TableCell>{card.name}</TableCell>
                <TableCell>{card.id}</TableCell>
                <TableCell>{card.maxLevel}</TableCell>
                <TableCell>{card.rarity}</TableCell>
                <TableCell>{card.elixirCost}</TableCell>
                <TableCell>
                  <img src={card.iconUrls.medium} alt={card.name} style={{ height: 150, width: 150 }} />
                  {card.iconUrls.evolutionMedium && <img src={card.iconUrls.evolutionMedium} alt={`${card.name} Evolution`} style={{ height: 150, width: 150 }} />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

export default App;
