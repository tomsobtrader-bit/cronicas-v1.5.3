import { CombatSystem }      from "./Systems/combatsystem.js"
import { RewardSystem }       from "./Systems/rewardsystem.js"
import { ShopSystem }         from "./Systems/shopsystem.js"
import { WorldMapRenderer }   from "./worldmap-renderer.js"
import { cardsData, STARTER_TROOPS, SPELLS_POOL } from "./Data/cardsdata.js"
import { initBackgroundCanvas } from "./effects.js"
import { audio }               from "./Systems/audiosystem.js"

export class Game {

    constructor() {
        this.runManager      = { level: 1 }
        this.deckList        = this._buildStarterDeck()
        this.playerHealth    = 30

        // ── Sistema de economía y reliquias ──────────────────────────────────
        this.gold            = 0
        this.relics          = []
        this.maxEnergy       = 10
        this.attackLimitBonus = 0

        this.combatSystem = new CombatSystem(this)
        this.rewardSystem = new RewardSystem(this)

        this.worldMap = null

        initBackgroundCanvas()
        audio.playLobbyMusic()

        console.log("Crónicas del Abismo — iniciado")
    }

    // ── Iniciar el mapa del mundo ─────────────────────────────────────────────
    initWorldMap(containerId) {
        this.worldMap = new WorldMapRenderer(containerId, this)
        this.worldMap.mount()
        this.worldMap.onNodeClick = (nodeId, zoneId, node) => {
            this._enterNode(nodeId, zoneId, node)
        }
        this.worldMap.show()
    }

    // ── Entrar a un nodo del mapa ─────────────────────────────────────────────
    _enterNode(nodeId, zoneId, node) {
        if (!node) return

        const mapOverlay = document.getElementById("world-map-overlay")
        const appEl      = document.getElementById("app")
        if (mapOverlay) mapOverlay.style.display = "none"
        if (appEl)      appEl.style.display      = "block"

        this._activeNodeId  = nodeId
        this._activeZoneId  = zoneId
        this._activeNode    = node

        const enemyHp = node.enemy?.health ?? 20
        this.runManager.level = this._nodeLevelIndex(nodeId)

        this.combatSystem = new CombatSystem(this)
        this.combatSystem.enemyHealth  = enemyHp
        this.combatSystem.playerHealth = this.playerHealth

        if (typeof window._updateRunBar === "function") window._updateRunBar()

        this.combatSystem.startCombat()
    }

    // ── Cuando el jugador gana un combate ─────────────────────────────────────
    advanceLevel() {
        const node   = this._activeNode
        const nodeId = this._activeNodeId

        if (!node) { location.reload(); return }

        // Guardar HP del jugador
        this.savePlayerHealth(this.combatSystem.playerHealth)

        // Marcar nodo como completado
        if (this.worldMap) {
            this.worldMap.completeNode(nodeId)
        }

        // Fin de run
        if (node.rewards?.isFinalBoss) return

        // ── Otorgar oro ──────────────────────────────────────────────────────
        const baseGold  = node.rewards?.gold ?? 10
        const goldBonus = this.relics
            .filter(r => r.effect?.type === "relic_gold_bonus")
            .reduce((sum, r) => sum + (r.effect.amount || 0), 0)
        const earned = baseGold + goldBonus
        this.gold += earned
        console.log(`💰 +${earned} oro (${baseGold} base + ${goldBonus} reliquias) | Total: ${this.gold}`)

        // ── ¿Abrir tienda? (cada 4 nodos) ───────────────────────────────────
        const level      = this.runManager.level
        const isShopNode = level % 4 === 0

        if (isShopNode) {
            this._openShop(() => this._showRewards())
        } else {
            this._showRewards()
        }
    }

    // ── Abrir tienda ──────────────────────────────────────────────────────────
    _openShop(onClose) {
        const shop = new ShopSystem(this)
        shop.open(this.runManager.level, () => {
            if (onClose) onClose()
        })
    }

    // ── Mostrar recompensas de carta ──────────────────────────────────────────
    _showRewards() {
        const rewards = this.rewardSystem.generateRewards(this.runManager.level)
        this.rewardSystem.renderRewardScreen(rewards, (chosenCard) => {
            this.addCardToDeck(chosenCard)
            this._backToMap()
        })
    }

    // ── Volver al mapa ────────────────────────────────────────────────────────
    _backToMap() {
        const appEl      = document.getElementById("app")
        const mapOverlay = document.getElementById("world-map-overlay")

        if (appEl)      appEl.style.display      = "none"
        if (mapOverlay) mapOverlay.style.display  = "flex"

        if (this.worldMap) {
            this.worldMap._renderTabs()
            this.worldMap._renderZone(this.worldMap.selectedZone)
        }

        audio.playLobbyMusic()
    }

    // ── Convertir nodeId a nivel numérico ─────────────────────────────────────
    _nodeLevelIndex(nodeId) {
        const zMatch = nodeId.match(/z(\d+)n(\d+)/)
        if (!zMatch) return 1
        const zone = parseInt(zMatch[1])
        const node = parseInt(zMatch[2])
        return (zone - 1) * 10 + node
    }

    // ── Mazo inicial ──────────────────────────────────────────────────────────
    _buildStarterDeck() {
        const troopIds = [...STARTER_TROOPS].sort(() => Math.random() - 0.5)
        const spellIds = [...SPELLS_POOL].sort(() => Math.random() - 0.5)
        const all      = Object.values(cardsData)
        const deck     = []
        for (const id of troopIds) {
            if (deck.length >= 4) break
            const c = all.find(c => c.id === id)
            if (c) deck.push(c)
        }
        const spell = all.find(c => c.id === spellIds[0])
        if (spell) deck.push(spell)
        return deck
    }

    addCardToDeck(card) {
        if (!card || this.deckList.length >= 10) return
        this.deckList.push(card)
        console.log(`Carta añadida: ${card.name} (${this.deckList.length}/10)`)
    }

    savePlayerHealth(hp) {
        this.playerHealth = Math.max(1, hp)
    }
}