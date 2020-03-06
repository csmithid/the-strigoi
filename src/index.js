import './styles.scss'
import * as ROT from 'rot-js'
import _ from 'lodash'
import 'babel-polyfill'

//TODO:

//Options

const gameOptions = {
  //General game options
  width: 16,
  height: 16
}

const displayOptions = {
  //ROT.JS display configuration
  width: gameOptions.width,
  height: gameOptions.height,
  fontSize: 24,
  fontFamily: 'IBM Plex Mono',
  bg: 'white',
  fg: 'dimGrey',
  forceSquareRatio: true
}

const colors = {
  //Display colors per tile
  '#': 'dimgrey',
  '<': 'palevioletred',
  '.': 'lightgrey',
  _: 'lightgrey',
  ',': 'gainsboro',
  '~': 'dodgerblue',
  '=': 'indianred'
}

const monsterDescriptions = [
  //Presented when a monster is close
  'Its tongue dangles like a pendulum!',
  'Its presence makes my bleed feel hot.',
  'A dreadful shriek rings through the cavern!',
  'Cataracts cloud its bloated eyes.',
  'Its pallid form jerks toward me!',
  'Watery sounds gurgle from its throat.',
  'The smell is nauseating!',
  'I see razor teeth glint in the darkness.'
]

const woundMessages = [
  //Presented when bleeding
  'I slip on a loose stone.',
  'My knee buckles.',
  'I feel another bone crack.',
  'I wince from the pain.',
  'My wound splits further open.',
  'Ouch! That rock was sharp.',
  'I lose my sense of balance.',
  'My vision blurs.'
]

const storyMessages = [
  //Presented the first 8 times the player bleeds.
  'Ach, that stings. Best not celebrate quite yet.',
  "I fell nearly 8 stories down. I'm badly wounded.",
  "My leg is bent the wrong way. And I can't move my arm at all.",
  'Every step taken is painful. I need to get out of here.',
  "There's no way I'll be able to fight like this. I can only run.",
  "There's so much water in this cave. It might wash away my trail.",
  'I can dive underwater to hide if I get into trouble.',
  "I need to get out of here before I've no blood left!"
]

const levelIntros = {
  //Presented each time the player climbs the stairs.
  '1': 'After all those tries ... finally, I found the Orb of Zot!',
  '2': "I'm bleeding out from the fall. Climbing stairs makes it worse.",
  '3': 'My god, what was that thing? ' + _.sample(monsterDescriptions),
  '4': "That monster has a nose for blood. But it can't see me very well.",
  '5': 'Another one? They must be attracted to the Orb of Zot.',
  '6': 'The cavern seems to be opening up a bit.',
  '7': 'My bleeding is getting much worse. They are swarming in!',
  '8': "I'm almost there - I can see the light of the exit from here!"
}

//Screen Objects

let Display = null //Initialize the display after a sleep function (to load font)

let Console = {
  //The Console is a single-line positioned below the Display.
  element: document.getElementById('console'),
  header: document.getElementById('header'),
  message: {},
  history: [],
  print: function(message, color = 'dimgrey') {
    this.history.push(this.message)
    this.message = { text: message, color: color }
    this.update()
  },
  linkPrint: function(message, color, href) {
    this.element.textContent = message
    this.element.href = href
    this.element.style.color = color
  },
  update: function() {
    this.element.textContent = this.message.text
    this.element.style.color = this.message.color
  },
  clear: function() {
    this.print('')
  }
}

//Game Objects

let Player = {
  x: null,
  y: null,
  isPlayer: true,
  dead: false,
  justMoved: false,
  justClimbed: false,
  color: 'goldenrod',
  bleedChance: 0.3,
  bleedCounter: 0,
  init: function() {
    let playerStart = World.freeCells[0]
    this.x = playerStart.x
    this.y = playerStart.y
    Game.actors.push(this)
    Game.scheduler.add(this, true)
  },
  draw: function() {
    if (!this.dead) {
      Display.draw(
        this.x,
        this.y,
        '@',
        World.isBloody(this.x, this.y) ? 'indianred' : this.color
      )
    }
  },
  act: async function() {
    let action = false
    while (!action) {
      await new Promise(resolve => setTimeout(resolve, 100))
      let e = await new Promise(resolve => {
        window.addEventListener('keydown', resolve, { once: true })
      })
      action = this.handleKey(e)
    } //Await a valid movement

    if (World.map[this.x][this.y] === '<') {
      Player.wound(0.1)
      Game.createLevel()
    }

    if (_.random(true) < this.bleedChance && this.justMoved) {
      //Chance to bleed
      this.bleed()
    }

    if (!this.justMoved && !this.justClimbed) {
      if (World.isWater(this.x, this.y)) {
        Console.print('I dive under the water!', 'dodgerblue')
      } else {
        Console.print("If I stand still, maybe I'll be harder to spot.")
      }
    }

    this.justClimbed = false
  },
  bleed: function() {
    if (this.bleedCounter < storyMessages.length) {
      Console.print(storyMessages[this.bleedCounter], 'indianred')
    } else {
      Console.print(
        _.sample(woundMessages) + ' My blood drips onto the floor!',
        'indianred'
      )
    }
    World.addBlood(this.x, this.y)
    this.bleedCounter += 1
  },
  handleKey: function(e) {
    var keyCode = []
    //Arrows
    keyCode[38] = 0
    keyCode[33] = 1
    keyCode[39] = 2
    keyCode[34] = 3
    keyCode[40] = 4
    keyCode[35] = 5
    keyCode[37] = 6
    keyCode[36] = 7
    //VI
    keyCode[75] = 0
    keyCode[85] = 1
    keyCode[76] = 2
    keyCode[78] = 3
    keyCode[74] = 4
    keyCode[66] = 5
    keyCode[72] = 6
    keyCode[89] = 7
    //Numbers
    keyCode[56] = 0
    keyCode[57] = 1
    keyCode[54] = 2
    keyCode[51] = 3
    keyCode[50] = 4
    keyCode[49] = 5
    keyCode[52] = 6
    keyCode[55] = 7
    //Extras
    keyCode[144] = 'wait'
    keyCode[12] = 'wait'
    keyCode[53] = 'wait'
    keyCode[190] = 'wait'

    var code = e.keyCode

    if (!(code in keyCode)) {
      return false
    }

    Console.clear()

    if (keyCode[code] === 'wait') {
      this.justMoved = false
      return true
    }

    let diff = ROT.DIRS[8][keyCode[code]]
    if (World.isPassable(this.x + diff[0], this.y + diff[1])) {
      this.x += diff[0]
      this.y += diff[1]
      this.justMoved = true
      return true
    } else {
      Console.print("I can't move into a solid wall!")
      return false
    }
  },
  wound: function(amount, reason) {
    this.bleedChance += amount
    if (this.bleedChance < 0.25) {
      //Console.print(reason + " My wound stings.");
    } else if (this.bleedChance < 0.5) {
      //Console.print(reason + " The bleeding is getting worse.");
      this.color = 'darkgoldenrod'
    } else if (this.bleedChance < 0.75) {
      //Console.print(reason + " My clothes are soaked in blood.");
      this.color = 'chocolate'
    } else if (this.bleedChance < 1) {
      //Console.print(reason + ` I don't think I can last much longer!`);
      this.color = 'sienna'
    } else {
      //Console.print(reason + " I am dead!", "indianred");
      this.color = 'black'
    }
  },
  kill: function(reason) {
    Console.print(reason + ' I am dead!', 'indianred')
    Console.linkPrint(
      reason + ' Click here to try again.',
      'indianred',
      'index.html'
    )
    Game.actors.splice(Game.actors.indexOf(this), 1)
    Game.scheduler.remove(this)
    this.dead = true
  }
}

let Game = {
  level: 0,
  map: [],
  actors: [],
  scheduler: new ROT.Scheduler.Simple(),
  win: false,
  engine: async function() {
    while (true) {
      let actor = this.scheduler.next()
      if (Player.dead) {
        this.draw()
        break
      }
      if (this.level >= 9) {
        this.endGame()
        break
      }
      await actor.act()
      this.draw()
    }
  },
  init: async function() {
    await sleep(500).then(() => {
      Display = new ROT.Display(displayOptions)
      let canvas = document.getElementById('canvas')
      canvas.appendChild(Display.getContainer())
    })

    Display.clear()
    Display.draw(6.5, 6, 'y k u')
    Display.draw(8, 7, 'Use h . l to move.')
    Display.draw(6.5, 8, 'b j n')
    Display.draw(8, 11, 'Press any key to start.')

    let start = false
    while (!start) {
      await new Promise(resolve => setTimeout(resolve, 100))
      await new Promise(resolve => {
        window.addEventListener('keydown', resolve, { once: true })
      })
      start = function(e) {
        return true()
      }
    } //Await a keypress

    Console.print(`After all those tries ... finally, I found the Orb of Zot!`)
    this.createLevel()
    Player.init()
    this.engine()
    this.draw()
  },
  createLevel: function() {
    this.level += 1
    World.generate()
    this.actors.forEach((actor, index) => {
      if (actor instanceof Strigoi) {
        this.scheduler.remove(actor)
      }
    })
    this.actors = [Player]
    Player.justClimbed = true
    for (let count = Math.floor(this.level / 2); count > 0; count -= 1) {
      let enemy = new Strigoi(World.freeCells)
      this.actors.push(enemy)
      this.scheduler.add(enemy, true)
    }
    Console.print(levelIntros[this.level.toString()])
  },
  draw: function() {
    Display.clear()
    World.draw()
    this.actors.forEach(actor => {
      actor.draw()
    })
  },
  endGame: function() {
    this.win = true
    World.map = []
    this.actors = []
    Display.clear()
    Display.draw(8, 8, 'You escaped the strigoi!', 'violet')
    Console.print(
      "I can't believe it - I escaped the horde! Time to sell this McGuffin."
    )
  }
}

let World = {
  map: [],
  freeCells: [],
  generate: function() {
    let map = []

    for (let i = 0; i < gameOptions.width; i++) {
      map[i] = []
      for (let j = 0; j < gameOptions.height; j++) {
        map[i][j] = '#'
      }
    }

    let freeCells = []

    let digger = new ROT.Map.Cellular(
      gameOptions.width - 2,
      gameOptions.height - 2
    )
    digger.randomize(0.5 - Game.level * 0.01)
    digger.create((x, y, value) => {
      if (value) {
        map[x + 1][y + 1] = '#'
      } else {
        freeCells.push({ x: x + 1, y: y + 1 })
        map[x + 1][y + 1] = _.sample(['.', ','])
      }
    })
    digger.connect((x, y, value) => {
      if (value) {
        return
      } else {
        if (map[x + 1][y + 1] === '#') {
          map[x + 1][y + 1] = '_'
        } else {
          return
        }
      }
    })
    digger.randomize(0.4 + Game.level * 0.01)
    digger.create((x, y, value) => {
      if (value) {
        if (map[x + 1][y + 1] !== '#') {
          map[x + 1][y + 1] = '~'
        }
      } else {
        return
      }
    })

    let exitLocation =
      Game.level % 2 === 1 ? _.last(freeCells) : _.first(freeCells)
    map[exitLocation.x][exitLocation.y] = '<'

    this.map = map
    this.freeCells = freeCells
    Player.justMoved = false
  },
  draw: function() {
    this.map.forEach((element, x) => {
      element.forEach((element, y) => {
        Display.draw(x, y, element, colors[element] || 'red')
      })
    })
  },
  addBlood: function(x, y) {
    if (this.map[x][y] === '~') {
      Console.print('The river washes away my blood.', 'dodgerblue')
    } else {
      this.map[x][y] = '=' //_.sample(["-", "="])
    }
  },
  bloodyCells: function() {
    let list = []
    this.map.forEach((element, x) => {
      element.forEach((element, y) => {
        if (World.map[x][y] === '=') {
          list.push({ x: x, y: y })
        }
      })
    })
    return list
  },
  isBloody: function(x, y) {
    if (this.map[x][y] === '=') {
      return true
    } else {
      return false
    }
  },
  removeBlood: function(x, y) {
    if (World.isBloody(x, y)) {
      World.map[x][y] = _.sample([',', '.'])
    } else {
    }
  },
  isPassable: function(x, y) {
    if (World.map[x][y] === '#') {
      return false
    } else {
      return true
    }
  },
  isEmpty: function(x, y) {
    let actorArray = Game.actors.filter(actor => {
      if (actor.x === x && actor.y === y && !actor.isPlayer) {
        return true
      }
    })

    if (actorArray.length > 0) {
      return false
    }

    return true
  },
  isWater: function(x, y) {
    if (this.map[x][y] === '~') {
      return true
    } else {
      return false
    }
  }
}

class Strigoi {
  constructor(freeCells) {
    let spawnArea = freeCells.filter(cell => {
      if (distance(cell.x, cell.y, Player.x, Player.y) > 8) {
        return true
      } else {
        return false
      }
    })
    let spawnPosition = _.sample(spawnArea)
    this.x = spawnPosition.x
    this.y = spawnPosition.y
    this.target = false
    this.color = 'black'
  }
  draw() {
    Display.draw(this.x, this.y, 'M', this.color)
  }
  act() {
    this.determineTarget()
    if (this.target) {
      let dijkstra = new ROT.Path.Dijkstra(
        this.target.x,
        this.target.y,
        World.isPassable
      )
      let path = []
      dijkstra.compute(this.x, this.y, function(x, y) {
        path.push({ x: x, y: y })
      })
      if (path[1] && World.isEmpty(path[1].x, path[1].y)) {
        let moveTo = path[1]
        this.x = moveTo.x
        this.y = moveTo.y
      }
    }

    this.drinkBlood()

    if (this.x === Player.x && this.y === Player.y) {
      for (let i = this.x - 1; i <= this.x + 1; i += 1) {
        for (let j = this.y - 1; j <= this.y + 1; j += 1) {
          if (World.isPassable(i, j)) {
            World.addBlood(i, j)
          }
        }
      }
      if (Player.justMoved) {
        Player.kill('The monster saw me move - it pounces!')
      } else {
        Player.kill('The monster stumbled upon my hiding spot.')
      }

      this.color = 'red'
    }
  }
  determineTarget() {
    let targets = [...World.bloodyCells()]
    if (
      (distance(this.x, this.y, Player.x, Player.y) < 3.75 &&
        Player.justMoved) ||
      (distance(this.x, this.y, Player.x, Player.y) < 1.5 &&
        !World.isWater(Player.x, Player.y))
    ) {
      Console.print('The monster spotted me! ' + _.sample(monsterDescriptions))
      targets.push({ x: Player.x, y: Player.y })
    }
    let closeTargets = _.sortBy(targets, target => {
      return distance(this.x, this.y, target.x, target.y)
    })
    this.target = closeTargets[0]
  }
  drinkBlood() {
    if (World.isBloody(this.x, this.y)) {
      Console.print('The monster slurps up the blood!')
      World.removeBlood(this.x, this.y)
      return true
    } else {
      return false
    }
  }
}

//Helpers

function distance(x, y, dx, dy) {
  return Math.sqrt(Math.pow(dx - x, 2) + Math.pow(dy - y, 2))
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

window.addEventListener(
  'keydown',
  function(e) {
    // space and arrow keys
    if ([32, 37, 38, 39, 40, 33, 34, 35, 36].indexOf(e.keyCode) > -1) {
      e.preventDefault()
    }
  },
  false
)

window.onload = Game.init()
//window.focus();
