from flask import Flask, jsonify, send_from_directory, Response, request
from pymongo import MongoClient, UpdateOne
import requests
from config import MONGO_URI, DB_NAME, API_URL, API_KEY
from bson import json_util
from datetime import datetime, timedelta

app = Flask(__name__)

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

def get_clash_royale_cards_from_api():
    headers = {'Authorization': f'Bearer {API_KEY}'}
    response = requests.get(f"{API_URL}/cards", headers=headers)
    if response.status_code == 200:
        return response.json().get('items', [])
    else:
        print("Erro ao buscar os dados da API:", response.status_code)
        return []

def get_clash_royale_cards_from_db():
    try:
        cards = list(db['cards'].find())
        for card in cards:
            card.pop('_id', None)
        return cards
    except Exception as e:
        print(f"Erro ao buscar os cards do banco de dados: {e}")
        return []

def insert_or_update_cards(cards):
    operations = []
    for card in cards:
        operations.append(
            UpdateOne(
                {'name': card['name']},
                {'$set': card},
                upsert=True
            )
        )
    if operations:
        db['cards'].bulk_write(operations)

def get_player_battles(player_tag):
    url = f"{API_URL}/players/%23{player_tag}/battlelog"
    headers = {'Authorization': f'Bearer {API_KEY}'}
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Erro ao buscar o histórico de batalhas do jogador {player_tag}: {response.status_code}")
        return None

def insert_player_battles_to_db(player_tag):
    battles = get_player_battles(player_tag)
    if battles:
        operations = []
        for battle in battles:
            battle_time_str = battle['battleTime']
            battle_time = datetime.strptime(battle_time_str, '%Y%m%dT%H%M%S.%fZ')

            battle['battleTime'] = battle_time

            operations.append(
                UpdateOne(
                    {'battleTime': battle['battleTime'], 'team.tag': battle['team'][0]['tag']},
                    {'$set': battle},
                    upsert=True
                )
            )
        try:
            db['battles'].bulk_write(operations)
            print(f"Batalhas do jogador {player_tag} inseridas/atualizadas no banco de dados com sucesso!")
        except Exception as e:
            print(f"Erro ao inserir batalhas no banco de dados: {e}")
    else:
        print(f"Nenhuma batalha encontrada para o jogador {player_tag}.")

def get_player_stats(player_tag):
    url = f"{API_URL}/players/%23{player_tag}"
    headers = {'Authorization': f'Bearer {API_KEY}'}
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Erro ao buscar as estatísticas do jogador {player_tag}: {response.status_code}")
        return {}

def insert_player_stats_to_db(player_tag):
    stats = get_player_stats(player_tag)
    if stats:
        try:
            db['player_stats'].update_one(
                {'tag': stats['tag']},
                {'$set': stats},
                upsert=True
            )
            print(f"Estatísticas do jogador {player_tag} inseridas/atualizadas no banco de dados com sucesso!")
        except Exception as e:
            print(f"Erro ao inserir as estatísticas no banco de dados: {e}")
    else:
        print(f"Nenhuma estatística encontrada para o jogador {player_tag}.")

def get_most_used_cards():
    pipeline = [
        {"$unwind": "$team"},
        {"$unwind": "$team.cards"},
        {"$group": {"_id": "$team.cards.name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    result = list(db['battles'].aggregate(pipeline))
    return result

def get_card_win_rate(card_name):
    pipeline = [
        {"$unwind": "$team"},
        {"$unwind": "$team.cards"},
        {"$match": {"team.cards.name": card_name}},
        {"$group": {
            "_id": "$team.cards.name",
            "total_battles": {"$sum": 1},
            "wins": {"$sum": {"$cond": [{"$eq": ["$team.crowns", 3]}, 1, 0]}}
        }},
        {"$project": {
            "card_name": "$_id",
            "win_rate": {"$cond": [{"$eq": ["$total_battles", 0]}, 0, {"$multiply": [{"$divide": ["$wins", "$total_battles"]}, 10]}]},
            "total_battles": 1,
            "total_battles": 1,
            "wins": 1
        }}
    ]
    result = list(db['battles'].aggregate(pipeline))
    return result

def get_player_win_stats(player_tag):
    result = db['player_stats'].find_one({"tag": f"#{player_tag}"}, {"wins": 1, "losses": 1, "battleCount": 1})
    if result:
        result.pop('_id', None)
    return result

def get_card_win_rate_in_time_range(card_name, start_time, end_time):
    pipeline = [
        {"$unwind": "$team"},
        {"$unwind": "$team.cards"},
        {"$match": {
            "team.cards.name": card_name,
            "battleTime": {"$gte": start_time, "$lte": end_time}
        }},
        {"$group": {
            "_id": "$team.cards.name",
            "total_battles": {"$sum": 1},
            "wins": {"$sum": {"$cond": [{"$eq": ["$team.crowns", 3]}, 1, 0]}}
        }},
        {"$project": {
            "card_name": "$_id",
            "win_rate": {"$cond": [{"$eq": ["$total_battles", 0]}, 0, {"$divide": ["$wins", "$total_battles"]}]},
            "total_battles": 1,
            "wins": 1
        }}
    ]
    result = list(db['battles'].aggregate(pipeline))
    return result


def get_decks_with_win_rate_above_range(percentage, start_time, end_time):
    pipeline = [
        {"$match": {
            "battleTime": {"$gte": start_time, "$lte": end_time}
        }},
        {"$unwind": "$team"},
        {"$group": {
            "_id": {
                "deck": "$team.cards.name",
                "player": "$team.tag"
            },
            "total_battles": {"$sum": 1},
            "wins": {"$sum": {"$cond": [{"$eq": ["$team.crowns", 3]}, 1, 0]}}
        }},
        {"$project": {
            "deck": "$_id.deck",
            "win_rate": {"$cond": [{"$eq": ["$total_battles", 0]}, 0, {"$multiply": [{"$divide": ["$wins", "$total_battles"]}, 100]}]},
            "total_battles": 1,
            "wins": 1
        }},
        {"$match": {
            "win_rate": {"$gt": percentage}
        }},
        {"$group": {
            "_id": "$deck",
            "total_battles": {"$sum": "$total_battles"},
            "wins": {"$sum": "$wins"},
            "win_rate": {"$avg": "$win_rate"}
        }},
        {"$sort": {"win_rate": -1}}
    ]

    result = list(db['battles'].aggregate(pipeline))
    return result


def get_losses(combo, start_time, end_time):
    query = {
        'battleTime': {'$gte': start_time, '$lte': end_time},
        'team.cards.name': {'$in': combo}, 
        'team.trophyChange': {'$lt': 0} 
    }
    losses_count = db['battles'].count_documents(query)
    return losses_count


def get_wins_with_conditions(card_name, trophy_percentage_difference):
    wins = list(db['battles'].aggregate([
        {
            "$match": {
                "team.cards.name": card_name,
                "team.trophyChange": {'$gt': 0},
                "matchDuration": {"$lt": 120}
            }
        },
        {
            "$lookup": {
                "from": "player_stats",
                "localField": "team.playerTag", 
                "foreignField": "tag",
                "as": "player_info"
            }
        },
        {
            "$unwind": "$player_info"
        },
        {
            "$project": {
                "trophyChange": 1,
                "playerTrophies": "$player_info.leagueStatistics.currentSeason.trophies",
                "opponentTrophies": {"$subtract": ["$player_info.leagueStatistics.currentSeason.trophies", "$team.trophyChange"]}
            }
        },
        {
            "$match": {
                "$expr": {
                    "$and": [
                        {
                            "$gt": [
                                {"$subtract": ["$playerTrophies", "$opponentTrophies"]},
                                {"$multiply": ["$opponentTrophies", trophy_percentage_difference]}
                            ]
                        }
                    ]
                }
            }
        }
    ]))

    return len(wins)

def get_card_combos_with_win_rate_above(n, percentage, start_time, end_time):
    pipeline = [
        {"$match": {
            "battleTime": {"$gte": start_time, "$lte": end_time}
        }},
        {"$unwind": "$team"},
        {"$unwind": "$team.cards"},
        {"$group": {
            "_id": {
                "player": "$team.tag"
            },
            "combo": {"$push": "$team.cards.name"}, 
            "total_battles": {"$sum": 1},
            "wins": {"$sum": {"$cond": [{"$eq": ["$team.crowns", 3]}, 1, 0]}}
        }},
        {"$project": {
            "combo": {"$slice": ["$combo", n]}, 
            "combo_size": {"$size": {"$slice": ["$combo", n]}},
            "win_rate": {"$cond": [{"$eq": ["$total_battles", 0]}, 0, {"$multiply": [{"$divide": ["$wins", "$total_battles"]}, 100]}]},
            "total_battles": 1,
            "wins": 1
        }},
        {"$match": {
            "combo_size": n, 
            "win_rate": {"$gt": percentage}
        }},
        {"$sort": {"win_rate": -1}}
    ]
    
    result = list(db['battles'].aggregate(pipeline))
    return result


def get_cards_with_high_loss_rate(percentage, start_time, end_time):
    pipeline = [
        {"$match": {
            "battleTime": {"$gte": start_time, "$lte": end_time}
        }},
        {"$unwind": "$team"},
        {"$unwind": "$team.cards"},
        {"$group": {
            "_id": "$team.cards.name",
            "total_battles": {"$sum": 1},
            "losses": {"$sum": {"$cond": [{"$lt": ["$team.crowns", 1]}, 1, 0]}}
        }},
        {"$project": {
            "card_name": "$_id",
            "loss_rate": {"$cond": [{"$eq": ["$total_battles", 0]}, 0, {"$multiply": [{"$divide": ["$losses", "$total_battles"]}, 100]}]},
            "total_battles": 1,
            "losses": 1
        }},
        {"$match": {
            "loss_rate": {"$gt": percentage}
        }},
        {"$sort": {"loss_rate": -1}}
    ]
    
    result = list(db['battles'].aggregate(pipeline))
    return result

def get_card_performance_against_opponent_card(card_name, opponent_card, start_time, end_time):
    pipeline = [
        {"$match": {
            "battleTime": {"$gte": start_time, "$lte": end_time},
            "team.cards.name": card_name
        }},
        {"$unwind": "$opponent"},      
        {"$unwind": "$opponent.cards"},
        {"$match": {
            "opponent.cards.name": opponent_card
        }},
        {"$group": {
            "_id": {
                "team_card": card_name, 
                "opponent_card": opponent_card
            },
            "total_battles": {"$sum": 1}, 
            "wins": {"$sum": {"$cond": [{"$gt": ["$team.crowns", "$opponent.crowns"]}, 1, 0]}}
        }},
        {"$project": {
            "team_card": "$_id.team_card", 
            "opponent_card": "$_id.opponent_card",
            "win_rate": {"$cond": [
                {"$eq": ["$total_battles", 0]},
                0, 
                {"$multiply": [{"$divide": ["$wins", "$total_battles"]}, 100]}
            ]},
            "total_battles": 1,
            "wins": 1
        }},
        {"$sort": {"win_rate": -1}}
    ]
    
    result = list(db['battles'].aggregate(pipeline))
    return result

def get_all_cards_performance_against_opponent_card(opponent_card, start_time, end_time):
    pipeline = [
        {"$match": {
            "battleTime": {"$gte": start_time, "$lte": end_time}
        }},
        {"$unwind": "$team"}, 
        {"$unwind": "$team.cards"}, 
        {"$unwind": "$opponent"}, 
        {"$unwind": "$opponent.cards"}, 
        {"$match": {
            "opponent.cards.name": opponent_card 
        }},
        {"$group": {
            "_id": "$team.cards.name", 
            "total_battles": {"$sum": 1}, 
            "wins": {"$sum": {"$cond": [{"$gt": ["$team.crowns", "$opponent.crowns"]}, 1, 0]}}
        }},
        {"$project": {
            "card_name": "$_id", 
            "win_rate": {"$cond": [
                {"$eq": ["$total_battles", 0]}, 
                0, 
                {"$multiply": [{"$divide": ["$wins", "$total_battles"]}, 100]} 
            ]},
            "total_battles": 1,
            "wins": 1
        }},
        {"$sort": {"win_rate": -1}}
    ]
    
    result = list(db['battles'].aggregate(pipeline))
    return result



def get_trending_cards_usage(start_time, end_time, interval):
    pipeline = [
        {"$match": {
            "battleTime": {"$gte": start_time, "$lte": end_time}
        }},
        {"$unwind": "$team"},
        {"$unwind": "$team.cards"},
        {"$group": {
            "_id": {
                "card_name": "$team.cards.name"
            },
            "usage_count": {"$sum": 1}
        }},
        {"$project": {
            "card_name": "$_id.card_name",
            "time_interval": "$_id.time_interval",
            "usage_count": 1
        }},
        {"$sort": {"time_interval": 1, "usage_count": -1}}
    ]
    
    result = list(db['battles'].aggregate(pipeline))
    return result

@app.route('/')
def index():
    return send_from_directory('templates', 'index.html')


@app.route('/get-cards', methods=['GET'])
def get_cards():
    cards = get_clash_royale_cards_from_db()
    if not cards:
        return jsonify({"error": "Nenhuma carta encontrada no banco de dados"}), 404
    return jsonify(cards), 200

@app.route('/insert-cards', methods=['GET'])
def insert_cards():
    cards = get_clash_royale_cards_from_api()
    if not cards:
        return jsonify({"error": "Não foi possível buscar os dados da API"}), 500
    insert_or_update_cards(cards)
    return jsonify({"message": "Cartas inseridas/atualizadas com sucesso!"}), 200

@app.route('/get-battles', methods=['GET'])
def get_battles():
    battles = list(db['battles'].find({}, {'_id': 0}))
    return jsonify(battles)

@app.route('/insert-battles/<player_tag>', methods=['GET'])
def insert_battles(player_tag):
    insert_player_battles_to_db(player_tag)
    return jsonify({"message": f"Batalhas do jogador {player_tag} inseridas/atualizadas com sucesso!"}), 200

@app.route('/insert-stats/<player_tag>', methods=['GET'])
def insert_stats(player_tag):
    insert_player_stats_to_db(player_tag)
    return jsonify({"message": f"Estatísticas do jogador {player_tag} inseridas/atualizadas com sucesso!"}), 200

@app.route('/get-most-used-cards', methods=['GET'])
def most_used_cards():
    result = get_most_used_cards()
    return jsonify(result), 200

@app.route('/get-card-win-rate/<card_name>', methods=['GET'])
def card_win_rate(card_name):
    result = get_card_win_rate(card_name)
    return jsonify(result), 200

@app.route('/get-player-stats/<player_tag>', methods=['GET'])
def player_stats(player_tag):
    result = get_player_win_stats(player_tag)
    if result:
        return Response(json_util.dumps(result), mimetype='application/json')
    else:
        return jsonify({"error": "Estatísticas não encontradas para o jogador."}), 404

@app.route('/get-card-win-rate-in-time-range/<card_name>', methods=['GET'])
def card_win_rate_in_time_range(card_name):
    start_time = request.args.get('start_time')
    end_time = request.args.get('end_time')

    if not start_time or not end_time:
        return jsonify({"error": "Os parâmetros start_time e end_time são obrigatórios."}), 400
    
    try:
        start_time = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
        end_time = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
    except ValueError:
        return jsonify({"error": "Formato de data inválido. Use o formato YYYY-MM-DDTHH:MM:SSZ."}), 400
    
    result = get_card_win_rate_in_time_range(card_name, start_time, end_time)
    if result:
        return jsonify(result), 200
    else:
        return jsonify({"error": "Nenhuma batalha encontrada para a carta e intervalo de tempo especificado."}), 200


@app.route('/get-decks-win-in-timerange', methods=['GET'])
def get_decks():
    percentage = float(request.args.get('percentage'))
    start_time = request.args.get('start_time')
    end_time = request.args.get('end_time')

    start_time = datetime.fromisoformat(start_time)
    end_time = datetime.fromisoformat(end_time)

    decks = get_decks_with_win_rate_above_range(percentage, start_time, end_time)

    return jsonify(decks)


@app.route('/get-losses-in-timerange', methods=['GET'])
def get_losses_in_timerange():
    try:
        combo = request.args.get('combo').split(',')
        start_time = request.args.get('start_time')
        end_time = request.args.get('end_time')

        start_time = datetime.fromisoformat(start_time)
        end_time = datetime.fromisoformat(end_time)
        
        losses_count = get_losses(combo, start_time, end_time)

        return jsonify({'losses': losses_count})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/get-wins-with-conditions', methods=['GET'])
def wins_with_conditions():
    card_name = request.args.get('card_name')
    trophy_percentage_difference = float(request.args.get('trophy_percentage_difference'))

    if not card_name or trophy_percentage_difference is None:
        return jsonify({"error": "Os parâmetros card_name e trophy_percentage_difference são obrigatórios."}), 400
    
    try:
        trophy_percentage_difference = float(trophy_percentage_difference)
        trophy_difference_factor = (100 - trophy_percentage_difference) / 100

        wins = get_wins_with_conditions(card_name, trophy_difference_factor)
        if wins == 0:
            wins = "0"
        return jsonify(wins), 200
    except ValueError:
        return jsonify({"error": "O parâmetro trophy_percentage_difference deve ser um número."}), 400

@app.route('/get-card-combos-win-rate', methods=['GET'])
def card_combos_win_rate():
    try:
        n = int(request.args.get('n'))
        percentage = float(request.args.get('percentage'))
        start_time = request.args.get('start_time')
        end_time = request.args.get('end_time')

        start_time = datetime.fromisoformat(start_time)
        end_time = datetime.fromisoformat(end_time)

        combos = get_card_combos_with_win_rate_above(n, percentage, start_time, end_time)

        return jsonify(combos)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/get-high-loss-rate-cards', methods=['GET'])
def high_loss_rate_cards():
    try:
        percentage = float(request.args.get('percentage'))
        start_time = request.args.get('start_time')
        end_time = request.args.get('end_time')

        start_time = datetime.fromisoformat(start_time)
        end_time = datetime.fromisoformat(end_time)

        high_loss_cards = get_cards_with_high_loss_rate(percentage, start_time, end_time)

        return jsonify(high_loss_cards)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/get-card-performance', methods=['GET'])
def card_performance():
    try:
        card_name = request.args.get('card_name')
        opponent_card = request.args.get('opponent_card')
        start_time = request.args.get('start_time')
        end_time = request.args.get('end_time')

        start_time = datetime.fromisoformat(start_time)
        end_time = datetime.fromisoformat(end_time)

        performance_data = get_card_performance_against_opponent_card(card_name, opponent_card, start_time, end_time)

        return jsonify(performance_data)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    

@app.route('/get-all-card-performance', methods=['GET'])
def all_card_performance():
    try:
        opponent_card = request.args.get('opponent_card')
        start_time = request.args.get('start_time')
        end_time = request.args.get('end_time')

        start_time = datetime.fromisoformat(start_time)
        end_time = datetime.fromisoformat(end_time)

        performance_data = get_all_cards_performance_against_opponent_card(opponent_card, start_time, end_time)

        return jsonify(performance_data)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    

@app.route('/get-trending-cards-usage', methods=['GET'])
def trending_cards_usage():
    try:
        start_time = request.args.get('start_time')
        end_time = request.args.get('end_time')

        start_time = datetime.fromisoformat(start_time)
        end_time = datetime.fromisoformat(end_time)
        interval = end_time - start_time
        interval = int(interval.total_seconds() * 1000)

        trending_usage_data = get_trending_cards_usage(start_time, end_time, interval)

        return jsonify(trending_usage_data)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True)
