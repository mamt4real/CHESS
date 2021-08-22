export const files = ['a','b','c','d','e','f','g','h'];
const negativeInfinity = -999999999;
const positiveInfinity = 999999999;

export default class Player{
    constructor(initialPos, pName){
        //variable that stores active pieces with their location on the board as the key
        this.pieces = initialPos;
        
        this.name = pName;

        //record the score of the player...base on the pieces he caught
        this.score = 0;

        //varible that stores the no of moves each piece did...its essentially created to track whether king or rook moves during castling
        this.movesCount = {
            "Rl":0,"Bl":0,"Nl":0,"K":0,"Q":0,"Nr":0,"Br":0,"Rr":0,"P1":0,"P2":0,"P3":0,"P4":0,"P5":0,"P6":0,"P7":0,"P8":0
        };

        /*movesRecord(an array of arrays): each move is recorded as an array of length 6
          0: from, 1: to, 2: it caught opponent's piece?, 3: move type (normal/enpassant/castling), 4: type of piece caught, 5: is promotion?
        */
        this.movesRecord = [];

        //keep track of weather king is in check? if yes record the attack path
        this.inCheck = false;
        this.checkAttackTrajectory = [];
        
        /* enpassantLiable: a variable created to keep track of possible enpassant move for the opponent
        *0: indicate enpassant is possible, 1: Pawn value, 2: tile where the pawn can be caught, 3: current tile of the pawn
        */
        this.enpassantLiable = [false,"","",""];
    }

    //function that returns all the squares player can attack opponent pieces
    attackSquares (opponent){
        let squares = [];
        for(let piece in this.pieces){
            if(this.pieces[piece].charAt(0) === "P"){
                let det = (this.name == "white")?-1:1;
                let col = files.indexOf(piece.charAt(0));
                let row = parseInt(piece.charAt(1));
                let index = [1,-1];
                for(let i=0;i<2;i++){                    
                    let c = col + index[i];
                    if(!(0<=c && c <8))
                        continue;
                    let id = files[c] + (row + det);
                    if(!this.pieces.hasOwnProperty(id) && !squares.includes(id))
                        squares.push(id);
                }

            }else{
                squares = [...new Set([...squares,...this.getValidMovesOf(piece,opponent)])]
            }
        }
        //console.log(squares);
        return squares;

    }
    generateAllValidMoves(opponent,onlyCaptures = false){
        let allMoves = [];
        for(let piece in this.pieces){
            let temp = this.getValidMovesOf(piece,opponent,true);
            for(let i=0;i<temp.length;i++){
                if(onlyCaptures && !opponent.pieces.hasOwnProperty(temp[i]))
                    continue;
                allMoves.push([piece,temp[i]]);
            }
        }
        /* if(onlyCaptures)
            allMoves = allMoves.filter(move => opponent.pieces.hasOwnProperty(move[1])); */
        return allMoves;
    }

    temporaryMove(from,to,opponent,testFunction){
        let temp = this.pieces[from];
        delete this.pieces[from];
        this.pieces[to] = temp;
        let tempVal = "";
        const checkValue = opponent.inCheck;
        const checkTrajectory = opponent.checkAttackTrajectory;
        const enpValue = this.enpassantLiable;
        let move = [from,to,false,"","",false];
        let isAcatch = opponent.pieces.hasOwnProperty(to);
        let enpCatch = false;
        let castle = false;
        let determiNant = 0;
        //check for normal catch
        if(isAcatch){
            tempVal = opponent.pieces[to];
            move = [from,to,true,"Normal",tempVal,false];
            delete opponent.pieces[to];
        }else if((temp.charAt(0) == "P") && (opponent.enpassantLiable[0]) && (opponent.enpassantLiable[2] == to)){
            enpCatch = true;
            move = [from,to,true,"Enpassant",opponent.enpassantLiable[1],false];
            delete opponent.pieces[opponent.enpassantLiable[3]];
        }
        //check for castling
        if(temp == "K"){
            determiNant = files.indexOf(from.charAt(0)) - files.indexOf(to.charAt(0));
            let rank = this.name == "white"?"8":"1";
            castle = (Math.abs(determiNant) == 2) && (from.charAt(1) === rank);
            if(castle){
                delete this.pieces[(determiNant == 2?"a":"h")+rank];
                this.pieces[(determiNant == 2?"c":"e")+rank] = "R" + (determiNant == 2?"l":"r");
                move = [to,(determiNant == 2?"c":"e")+rank,false,"Castle " + (determiNant == 2?"Kingside":"Queenside"),"",false];
            }
        }
        //effect opponent's check scenario
        if(this.attackSquares(opponent).includes(opponent.getKingPosition())){
            opponent.inCheck = true;
        }
        //check if the moving piece is a pawn and it moves two steps forward and update the enpassant array else reset the array
        if((temp.charAt(0) == "P") && (Math.abs(parseInt(from.charAt(1))-parseInt(to.charAt(1)))== 2)){
            let enpCatchID = to.charAt(0) + (parseInt(to.charAt(1)) + (this.name == "white"?1:-1));
            this.enpassantLiable = [true,"P" + (files.indexOf(to.charAt(0))+1),enpCatchID,to];
        }else
            this.enpassantLiable = [false,"","",""];

        let goAhead = testFunction();
        if(goAhead === "effect The Move")
            return move;
        delete this.pieces[to];
        this.pieces[from] = temp;
        if(isAcatch)
            opponent.pieces[to] = tempVal;
        if(enpCatch)
            opponent.pieces[opponent.enpassantLiable[3]] = opponent.enpassantLiable[1];

        if(castle){
            let rank = this.name == "white"?"8":"1";
            delete this.pieces[(determiNant == 2?"c":"e")+rank];
            this.pieces[(determiNant == 2?"a":"h")+rank] = "R" + (determiNant == 2?"l":"r");
        }
        opponent.inCheck = checkValue;
        opponent.checkAttackTrajectory = checkTrajectory;
        this.enpassantLiable = enpValue;
        return goAhead;
    }

    //A player is checkmated if he has no valid moves and his king is in check, if he has no moves and his king is not in check then its a stalemate
    getCheckMateStatus(opponent){
        let hasMoves = false;
        //using short circuit approach
        for(let piece in this.pieces)
            if(this.getValidMovesOf(piece,opponent,true).length > 0){
                hasMoves = true;
                break;
            }
        return [hasMoves,this.inCheck];
    }

    piecesCount(){
        let count = 0;
        for(const p in this.pieces)
            count++;
        return count;
    }

    getKingPosition(){
        let kingPos = "";
        for(let pos in this.pieces){
            if(this.pieces[pos] == "K"){
                kingPos = pos;
                break;
            }
        }
        return kingPos;
    }
    isValidFrom(id){
        return this.pieces.hasOwnProperty(id);
    }
    totalMoves(){
        let m = 0;
        for(let p in this.movesCount)
            m += this.movesCount[p];
        return m;
    }
    makeTheMove(from,to,opponent){

        let move = this.temporaryMove(from,to,opponent, () => "effect The Move");
        let temp = this.pieces[move[1]];

        let kingTile = document.getElementById(opponent.getKingPosition());
        //check if the move puts the opponent's king in check and effect it
        if(opponent.inCheck){
            kingTile.className += " glow";
        }
        
        this.inCheck = false;

        kingTile = document.getElementById(this.getKingPosition());
        //check if king position is previously glowing
        if(kingTile.className.endsWith("glow"))
            kingTile.className = "tiles";

        //update the player's score
        if(move[2]){
            this.score += getScore(move[4]);
        }
        this.movesCount[temp]++;
        this.movesRecord.push(move);
        return true;
    }
    evaluatePosition (opponent){
        let score = this.materialValue() + this.cornerOpponentsKingValue(opponent) + this.piecesDevelopmentValue();
        let oppScore = opponent.materialValue() + opponent.cornerOpponentsKingValue(this) + opponent.piecesDevelopmentValue();

        return score - oppScore;
    }

    materialValue = function(){
        let score = 0;
        for(const piece in this.pieces)
            score += getScore(this.pieces[piece]);
        return score;
    }
    piecesDevelopmentValue = function () {
        let score = 0;
        const pawnTarget = this.name=="white"?1:8;
        /*for(let p in this.pieces){
            let c = this.pieces[p].charAt(0);
            const rank = parseInt(p.charAt(1));
            const file = files.indexOf(p.charAt(0)) + 1;
            switch(c){
                case "P": //add score for a position that has more probability for pawn promotion
                    const pawnScore = 6 - Math.abs(rank - pawnTarget);
                    score += pawnScore*100;
                    break;
                case "N": //favour positions with nights closer to center to pose more threat
                    let distFromcenter = Math.max(3-file,file-4) + Math.max(3-rank,rank-4);
                    const nightScore = 8-distFromcenter;
                    score += nightScore*300;
                    break;
                case "R":
                    //
                    break;
            } 
        }*/

        return score;
        
    }
    cornerOpponentsKingValue = function(opponent){
        let score = 0;

        const opKingTile = opponent.getKingPosition();
        const kingTile = this.getKingPosition();

        let opKingFile = files.indexOf(opKingTile.charAt(0))+1;
        let opKingRank = parseInt(opKingTile.charAt(1));

        let opKingDistFrmCntr = Math.max(3-opKingFile,opKingFile-4) + Math.max(3-opKingRank,opKingRank-4);
        score += opKingDistFrmCntr;

        let kingFile = files.indexOf(kingTile.charAt(0))+1;
        let kingRank = parseInt(kingTile.charAt(1));

        let dstBtwKings = Math.abs(kingFile-opKingFile) + Math.abs(kingRank-opKingRank);
        score += 14 - dstBtwKings;

        let endGameWeight = (16 - opponent.piecesCount());

        //incentivise attacking possible moves of opponent's king without being close enough for the king to capture the piece
        let opKingsMoves = opponent.getValidMovesOf(opKingTile,this,true);
        let attackSquares = this.attackSquares(opponent);
        for(let i=0;i<opKingsMoves.length;i++)
            if(attackSquares.includes(opKingsMoves[i]))
                score += 5;

        return (score * 10 * endGameWeight);
    }
    getValidMovesOf (pieceID,opponent,filtered = false){
        let valids = [];
        let addFunc = function (i,j,player){
            let id = files[j] + "" + i;
            let temp = document.querySelector("#" + id + " img");
            if(!(player.pieces.hasOwnProperty(id)) && !(opponent.pieces.hasOwnProperty(id))){
                valids.push(id);
                return true;
            }else{
                if(opponent.pieces.hasOwnProperty(id))
                    valids.push(id);                
                return false;
            }   
        }
        
        let piece = this.pieces[pieceID].charAt(0);
        let row = parseInt(pieceID.charAt(1));
        let col = files.indexOf(pieceID.charAt(0));
        switch(piece){
            case "K":{
                let indexes = [1,1,1,0,1,-1,0,-1,-1,-1,-1,0,-1,1,0,1];
                for(let i=0;i<indexes.length-1;i+=2){                    
                    let c = col + indexes[i+1];
                    let r = row + indexes[i];
                    if(!(1<=r && r <= 8) || !(0<= c && c <8))
                        continue;
                    let id = files[c] + "" + r;                    
                    if(this.pieces.hasOwnProperty(id))
                        continue;
                    valids.push(id);
                }
                //check for possible castling if king has not yet moved ./.. the if(filtered) is there to avoid infinite recursion b/w attackSquares and getValidMovesOf
                if(filtered)
                if(this.movesCount["K"] == 0){
                    let player = this;
                    const attackedSquares = opponent.attackSquares(this);
                    const isPossible = function(spaces){
                        for(let i=0;i<spaces.length;i++)
                            if(player.pieces.hasOwnProperty(spaces[i]) || opponent.pieces.hasOwnProperty(spaces[i]) || attackedSquares.includes(spaces[i])){
                                return false;
                            }
                        return true;
                    }
                    let spaces = [];
                    let rook = this.name == "white"?"8":"1";
                    //check kingside castling if left rook has not yet moved...
                    if((this.pieces["a" + rook] === "Rl") && (this.movesCount["Rl"] == 0)){
                        spaces = this.name == "white"?["b8","c8"]:["b1","c1"];
                        if(isPossible(spaces))
                            valids.push(spaces[0]);
                    }
                    //check queenside castling if right rook has not yet moved...
                    if((this.pieces["h" + rook] === "Rr") && (this.movesCount["Rr"] == 0)){
                        spaces = this.name == "white"?["f8","e8","g8"]:["f1","e1","g1"];
                        if(isPossible(spaces))
                            valids.push(spaces[0]);
                    }
                }
               }   break;
            case "N":{
                let indexes = [1,2,2,1,2,-1,-2,-1,-1,-2,-1,2,-2,1,1,-2];
                for(let i=0;i<indexes.length-1;i+=2){
                    let c =col +indexes[i+1];
                    let r =row + indexes[i];
                    if(!(1<=r && r <= 8) || !(0<= c && c <8))
                        continue;
                    let id = files[c] + r;
                    if(this.pieces.hasOwnProperty(id))
                        continue;
                    valids.push(id);
                }
              }  break;
            case "B":{
                //add south-east
                for(let i=row+1,j=col+1;(i<=8)&&(j<8);j++,i++){
                    if(!addFunc(i,j,this))
                        break;
                }//add north-west
                for(let i=row-1,j=col-1;(i>=1)&&(j>=0);j--,i--){
                    if(!addFunc(i,j,this))
                        break;
                }//add north-east
                for(let i=row+1,j=col-1;(i<=8)&&(j>=0);j--,i++){
                    if(!addFunc(i,j,this))
                        break;
                }//add south-west
                for(let i=row-1,j=col+1;(i>=1)&&(j<8);j++,i--){
                    if(!addFunc(i,j,this))
                        break;
                }
               }   break;
            case "R":{
                //add upward
                for(let i = row +1;i<=8;i++){
                    if(!addFunc(i,col,this))
                        break;
                }//add downward
                for(let i = row -1;i>=1;i--){
                    if(!addFunc(i,col,this))
                        break;
                }//add rightward
                for(let i = col +1;i<8;i++){
                    if(!addFunc(row,i,this))
                        break;
                }//add leftward
                for(let i = col -1;i>=0;i--){
                    if(!addFunc(row,i,this))
                        break;
                }
                break;
            }
            case "Q":{
                for(let i=row+1,j=col+1;(i<=8) && (j<8);j++,i++){
                    if(!addFunc(i,j,this))
                        break;                                            
                }//add north-west                
                for(let i=row-1,j=col-1;(i>=1)&&(j>=0);j--,i--){
                    if(!addFunc(i,j,this))
                        break;
                }//add north-east
                for(let i=row+1,j=col-1;(i<=8)&&(j>=0);j--,i++){
                    if(!addFunc(i,j,this))
                        break;
                }//add south-west
                for(let i=row-1,j=col+1;(i>=1)&&(j<8);j++,i--){
                    if(!addFunc(i,j,this))
                        break;
                }//add upward
                for(let i = row +1;i<=8;i++){
                    if(!addFunc(i,col,this))
                        break;
                }//add downward
                for(let i = row -1;i>=1;i--){
                    if(!addFunc(i,col,this))
                        break;
                }//add rightward
                for(let i = col +1;i<8;i++){
                    if(!addFunc(row,i,this))
                        break;
                }//add leftward
                for(let i = col -1;i>=0;i--){
                    if(!addFunc(row,i,this))
                        break;
                }
              }  break;
            
            case "P":{
                //add the vertical movements;
                let det = (this.name == "white")?-1:1;
                let id = files[col] + "" + (row + det);                
                if(!(this.pieces.hasOwnProperty(id)) && !(opponent.pieces.hasOwnProperty(id))){
                    valids.push(id);                    
                    if(row == 2 || row == 7){
                        id = files[col] + "" + (row +(det*2));
                        if(!(this.pieces.hasOwnProperty(id)) && !(opponent.pieces.hasOwnProperty(id)))
                            valids.push(id);
                    }
                }
                //add the possible diagonal movements              
                let index = [1,-1];
                for(let i=0;i<2;i++){
                    let c = col+index[i];                    
                    if(!(0<=c && c <8))
                        continue;
                    id = files[c] + (row + det);
                    //normal catch
                    if(opponent.pieces.hasOwnProperty(id)){
                        valids.push(id);
                        continue;
                    }
                    //enpassant catch
                    let validrow = (this.name == "white")?4:5;
                    if((row == validrow) &&  (opponent.enpassantLiable[0]) && (opponent.enpassantLiable[2] == id))
                        valids.push(id);
                }
              }  break;
        }
        if(filtered){
            let player = this;
            valids = valids.filter(function (val){
                return player.temporaryMove(pieceID,val,opponent,function (){
                    return !opponent.attackSquares(player).includes(player.getKingPosition());
                });
            });
        }
        return valids;
    }

}

//AI chess player.....
export class AIplayer extends Player{

    constructor(initialPos,name, difficulty){
        super(initialPos,name);
        this._difficulty = difficulty;
    }

    set difficulty (x){
        this._difficulty = x;
    }

    getPromotion(){
        //decide which type to promote to.....
        
        //for now defaulted to queen
        return 1;
    }

    //method that returns the choosen move
    getNextMove(opponent) {
        //for now genenrate a random move...
        let player = this;
        let allMoves = orderMoves(player,opponent,this.generateAllValidMoves(opponent));

        let depth = 0;        
        switch(this._difficulty){
            case "easy":
                depth = 0;
                break;
            case "normal":
                depth = 1;
                break;
            case "hard":
                depth = 2;
                break;
            case "crazy":
                depth = 3;
                break
        }
        
        let bestMove = [positiveInfinity,null];
        for(let i=0;i<allMoves.length;i++){
            let b = allMoves[i];
            let temp = player.temporaryMove(b[0],b[1],opponent,function(){
                return searchBestMove(opponent,player,depth,negativeInfinity,positiveInfinity);
            });
            if(temp<bestMove[0])
                bestMove = [temp,b];
        }
        if(bestMove[1] == null)
            bestMove = allMoves[0];

        return bestMove[1]; //allMoves[0];
        
    }
   
}
//to be continued.....

/*since the search is a min max search the concept of alpha-beta pruning is implored to add effeciency
*see alpha beta pruning on wikepedia for more info...
*a great inspiration from "Sebastian league video on youtube captioned 'Coding Adventure: Chess AI' "
*/
function searchBestMove(player,opponent,depth,alpha,beta){
    if(depth == 0){
        return searchAllCaptures(player,opponent,alpha,beta);
    }

    let moves = orderMoves(player,opponent,player.generateAllValidMoves(opponent));
    if(moves.length == 0){
        if(player.inCheck)
            return negativeInfinity;
        return 0;
    }
    for(let i=0;i<moves.length;i++){
        let value = -player.temporaryMove(moves[i][0],moves[i][1],opponent,function(){
            return searchBestMove(opponent,player,depth-1,-beta,-alpha);
        });

        if(value >= beta){
            //the minimising players best move is not up to maximising players minimum move
            return beta;
        }
        alpha = Math.max(alpha,value);
    }
    return alpha;
}

function searchAllCaptures(player,opponent,alpha,beta){
    let value = player.evaluatePosition(opponent);
    if(value >= beta)
        return beta;
    alpha = Math.max(alpha,value);

    let moves = orderMoves(player,opponent,player.generateAllValidMoves(opponent,true));

    for(let i=0;i<moves.length;i++){
        let value = -player.temporaryMove(moves[i][0],moves[i][1],opponent,function(){
            return searchAllCaptures(opponent,player,-beta,-alpha);
        });

        if(value >= beta){
            //the minimising players best move is not up to maximising players minimum move
            return beta;
        }
        alpha = Math.max(alpha,value);
    }
    return alpha;
}

function orderMoves(player,opponent,moves){
    let opponentAttack = opponent.attackSquares(player);
    
    let moveGuessedScore = function(move){
        let score = 0
        let fromVal = getScore(move[0]);
        let isAcatch = opponent.pieces.hasOwnProperty(move[1]);

        //reward catching opponents player
        if(isAcatch){
            score += 10* getScore(opponent.pieces[move[1]]) - fromVal;
        }         
        
        //promotion is likely a good idea
        if((player.pieces[move[0]].charAt(0) == "P") && move[1].charAt(1) == "8")
            score += [0,900,300,300,500][player.getPromotion()];

        //penalised putting a player in danger
        if(opponentAttack.includes(move[1]))
            score -= fromVal;

        return score;
    }

    moves.sort((a,b) => moveGuessedScore(b) - moveGuessedScore(a));
    return moves;

}

function getScore(pieceType){
    let c = pieceType.charAt(0);
    switch(c){
        case "N":
            return 300;
        case "R":
            return 500;
        case "B":
            return 300;
        case "Q":
            return 900;
        default:
            return 100;
    }
}

function getAttackTrajectory(kingPos,assailantPos,assailantType){
    var trajectory = [assailantPos];
    /*if the attacking piece is either Pawn or Night
    Then the track is only the assailant Position
    */
    if(assailantType == 'P' || assailantType == 'N')
        return trajectory;

    /*else assailant is either Queen Bishop or Rook
    we get the row and col for both king and assailant
    and add all the tiles in between them*/

    var kingRow = parseInt(kingPos.charAt(1));
    var kingCol = files.indexOf(kingPos.charAt(0));
    var assailantRow = parseInt(assailantPos.charAt(1));
    var assailantCol = files.indexOf(assailantPos.charAt(0));

    switch(true){
    //if both king and assailant are on thesame row
        case (kingRow == assailantRow):{
            let update = kingCol<assailantCol ?1:-1;
            for(let i=kingCol +update; i != assailantCol ; i+=update)
                trajectory.push(files[i] + '' + kingRow);
            break;
    //if both king and assailant are on thesame column
        }case (kingCol == assailantCol):{
            let u = assailantRow < kingRow?1:-1;
            for(let i=assailantRow +u; i != kingRow; i+=u)
                trajectory.push(files[kingCol] + '' + i);
            break;			
    //both king and assailant are on the leading diagonal
        }case(((assailantRow-kingRow)*(assailantCol-kingCol)) >0):{
            let update = ((assailantRow-kingRow)>0)?-1:1;
            for(let i=assailantRow +update, j = assailantCol + update; i != kingRow ; i+=update,j+=update)
                trajectory.push(files[j] + '' + i);
            break;
    
    //both king and assailant are on the reverse diagonal
        }case(((assailantRow - kingRow)*(assailantCol - kingCol)) < 0):{
            let rowUpdate = ((assailantRow-kingRow)>0)?-1:1;
            let colUpdate = ((assailantCol - kingCol)>0)?-1:1;
            for(let i = assailantRow + rowUpdate, j = assailantCol + colUpdate; i != kingRow; i += rowUpdate, j += colUpdate)
                trajectory.push(files[j] + '' + i);
            break;
        }
    }
    return trajectory;
}
