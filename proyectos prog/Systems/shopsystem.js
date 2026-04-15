// ─────────────────────────────────────────────────────────────────────────────
// ShopSystem — Tienda entre combates para Crónicas del Abismo
// ─────────────────────────────────────────────────────────────────────────────

import { cardsData, RARITY_CONFIG, TROOPS_BY_RARITY, SPELLS_POOL } from "../Data/cardsdata.js"
import { audio } from "./audiosystem.js"

export const SHOP_ITEMS = {
    heal_small: {
        id: "heal_small", name: "Poción Menor",
        description: "Restaura 8 puntos de vida.",
        icon: "🧪", category: "consumable", baseCost: 30,
        effect: { type: "heal", amount: 8 }, rarity: "common",
        flavorText: "Sabe a ceniza y esperanza.",
    },
    heal_medium: {
        id: "heal_medium", name: "Elixir de Sangre",
        description: "Restaura 15 puntos de vida.",
        icon: "🩸", category: "consumable", baseCost: 55,
        effect: { type: "heal", amount: 15 }, rarity: "uncommon",
        flavorText: "De origen desconocido. Mejor no preguntar.",
    },
    heal_full: {
        id: "heal_full", name: "Esencia del Abismo",
        description: "Restaura vida hasta el máximo (30 HP).",
        icon: "💜", category: "consumable", baseCost: 100,
        effect: { type: "heal_full" }, rarity: "rare",
        flavorText: "El abismo devuelve lo que tomó. Por ahora.",
    },
    remove_card: {
        id: "remove_card", name: "Pira de Olvido",
        description: "Elimina una carta de tu mazo permanentemente.",
        icon: "🔥", category: "deck", baseCost: 40,
        effect: { type: "remove_card" }, rarity: "common",
        flavorText: "Lo que se quema no puede volver para dañarte.",
    },
    duplicate_card: {
        id: "duplicate_card", name: "Espejo Oscuro",
        description: "Duplica una carta de tu mazo.",
        icon: "🪞", category: "deck", baseCost: 70,
        effect: { type: "duplicate_card" }, rarity: "uncommon",
        flavorText: "Dos del mismo mal. O del mismo bien.",
    },
    upgrade_card: {
        id: "upgrade_card", name: "Cristal de Poder",
        description: "Mejora una carta: +1 ATK y +1 HP si es tropa, o -1 costo si es hechizo.",
        icon: "💎", category: "deck", baseCost: 80,
        effect: { type: "upgrade_card" }, rarity: "uncommon",
        flavorText: "El poder que duerme dentro puede despertar.",
    },
    relic_energy: {
        id: "relic_energy", name: "Corazón del Abismo",
        description: "Permanente: +1 energía máxima.",
        icon: "⚡", category: "relic", baseCost: 90,
        effect: { type: "relic_max_energy", amount: 1 }, rarity: "rare",
        flavorText: "Pulsa con un ritmo que no es el tuyo.",
    },
    relic_attack: {
        id: "relic_attack", name: "Amuleto del Estratega",
        description: "Permanente: el primer ataque de cada turno hace +2 daño extra.",
        icon: "🗡️", category: "relic", baseCost: 85,
        effect: { type: "relic_first_attack_bonus", amount: 2 }, rarity: "rare",
        flavorText: "Forjado en la primera batalla del abismo.",
    },
    relic_gold: {
        id: "relic_gold", name: "Bolsa de Guerra",
        description: "Permanente: +5 oro extra al ganar cada combate.",
        icon: "💰", category: "relic", baseCost: 60,
        effect: { type: "relic_gold_bonus", amount: 5 }, rarity: "uncommon",
        flavorText: "Siempre pesa más de lo que debería.",
    },
    relic_draw: {
        id: "relic_draw", name: "Biblioteca Antigua",
        description: "Permanente: robás 1 carta extra al inicio de cada combate.",
        icon: "📖", category: "relic", baseCost: 75,
        effect: { type: "relic_extra_draw", amount: 1 }, rarity: "uncommon",
        flavorText: "Los títulos están en un idioma que ya nadie habla.",
    },
    relic_attacks: {
        id: "relic_attacks", name: "Cadena del Berserker",
        description: "Permanente: +1 ataque disponible por turno.",
        icon: "⛓️", category: "relic", baseCost: 110,
        effect: { type: "relic_attack_limit", amount: 1 }, rarity: "epic",
        flavorText: "No se puede romper. Solo encadenar al portador.",
    },
}

export class ShopSystem {

    constructor(game) {
        this.game           = game
        this._onClose       = null
        this._stock         = []
        this._cardStock     = []
        this._pendingEffect = null
        this._lastMsg       = ""
    }

    open(level, onClose) {
        this._onClose       = onClose
        this._stock         = this._generateStock(level)
        this._cardStock     = this._generateCardStock(level)
        this._pendingEffect = null
        const appEl = document.getElementById("app")
        if (appEl) appEl.style.display = "block"
        this.render()
        audio.playLobbyMusic()
    }

    _generateStock(level) {
        const all    = Object.values(SHOP_ITEMS)
        const relics = this.game.relics || []
        const available = all.filter(item =>
            item.category !== "relic" || !relics.find(r => r.id === item.id)
        )
        const consumables = available.filter(i => i.category === "consumable")
        const deckItems   = available.filter(i => i.category === "deck")
        const relicItems  = available.filter(i => i.category === "relic")
        const picked = []

        // 1-2 consumibles según nivel
        const healCount = level >= 5 ? 2 : 1
        ;[...consumables].sort(() => Math.random() - 0.5)
            .slice(0, healCount).forEach(i => picked.push(i))

        // 1 item de mazo
        const deckPick = [...deckItems].sort(() => Math.random() - 0.5)[0]
        if (deckPick) picked.push(deckPick)

        // 1 reliquia si hay
        const relicPick = [...relicItems].sort(() => Math.random() - 0.5)[0]
        if (relicPick) picked.push(relicPick)

        return picked.map(item => ({
            ...item,
            cost: Math.round(item.baseCost * (1 + (level - 1) * 0.08)),
            sold: false,
        }))
    }

    _generateCardStock(level) {
        const all = Object.values(cardsData)
        let pool = []
        if      (level <= 3) pool = [...TROOPS_BY_RARITY.base, ...SPELLS_POOL]
        else if (level <= 6) pool = [...TROOPS_BY_RARITY.base, ...TROOPS_BY_RARITY.corrupta, ...SPELLS_POOL]
        else if (level <= 8) pool = [...TROOPS_BY_RARITY.corrupta, ...TROOPS_BY_RARITY.elite, ...SPELLS_POOL]
        else                 pool = [...TROOPS_BY_RARITY.elite, ...TROOPS_BY_RARITY.mistica, ...SPELLS_POOL]

        const shuffled = [...new Set(pool)].sort(() => Math.random() - 0.5)
        const picked   = []
        const seen     = new Set()
        for (const id of shuffled) {
            if (picked.length >= 3) break
            if (seen.has(id)) continue
            seen.add(id)
            const card = all.find(c => c.id === id)
            if (card) picked.push(card)
        }
        return picked.map(card => ({
            card,
            cost: this._cardPrice(card, level),
            sold: false,
        }))
    }

    _cardPrice(card, level) {
        const base = { base: 25, corrupta: 40, elite: 60, mistica: 85 }
        const rarityBase = base[card.rarity] || (card.type === "spell" ? 30 : 25)
        return Math.round(rarityBase * (1 + (level - 1) * 0.07))
    }

    // ─── COMPRAS ─────────────────────────────────────────────────────────────

    buyItem(itemId) {
        const item = this._stock.find(i => i.id === itemId)
        if (!item || item.sold) return
        if ((this.game.gold ?? 0) < item.cost) { this._showMessage("❌ Oro insuficiente"); return }
        this.game.gold -= item.cost
        item.sold = true
        this._applyItemEffect(item)
        audio.playCardPlay()
        this.render()
    }

    buyCard(index) {
        const entry = this._cardStock[index]
        if (!entry || entry.sold) return
        if ((this.game.gold ?? 0) < entry.cost) { this._showMessage("❌ Oro insuficiente"); return }
        if ((this.game.deckList?.length ?? 0) >= 10) {
            this._pendingEffect = { type: "card_swap", card: entry.card, entry }
            this._showMessage("🔄 Mazo lleno — elegí una carta a reemplazar")
            this.render(); return
        }
        this.game.gold -= entry.cost
        entry.sold = true
        this.game.deckList = this.game.deckList || []
        this.game.deckList.push(entry.card)
        this._showMessage(`✅ ${entry.card.name} añadida al mazo`)
        audio.playCardPlay()
        this.render()
    }

    swapDeckCard(deckIndex) {
        if (!this._pendingEffect || this._pendingEffect.type !== "card_swap") return
        const { card, entry } = this._pendingEffect
        if ((this.game.gold ?? 0) < entry.cost) { this._showMessage("❌ Oro insuficiente"); this._pendingEffect = null; this.render(); return }
        this.game.gold -= entry.cost
        entry.sold = true
        const removed = this.game.deckList[deckIndex]
        this.game.deckList.splice(deckIndex, 1, card)
        this._pendingEffect = null
        this._showMessage(`✅ ${removed.name} → ${card.name}`)
        audio.playCardPlay()
        this.render()
    }

    cancelSwap() { this._pendingEffect = null; this.render() }

    applyDeckEffect(cardIndex) {
        if (!this._pendingEffect) return
        const card = this.game.deckList[cardIndex]
        if (!card) return
        if (this._pendingEffect.type === "remove_card") {
            this.game.deckList.splice(cardIndex, 1)
            this._showMessage(`🔥 ${card.name} eliminada del mazo`)
        }
        if (this._pendingEffect.type === "duplicate_card") {
            if ((this.game.deckList?.length ?? 0) < 10) {
                this.game.deckList.push({ ...card })
                this._showMessage(`🪞 ${card.name} duplicada en el mazo`)
            } else {
                this._showMessage("❌ Mazo lleno")
            }
        }
        if (this._pendingEffect.type === "upgrade_card") {
            if (card.type === "troop") {
                card.attack  = (card.attack  || 0) + 1
                card.health  = (card.health  || 0) + 1
                this._showMessage(`💎 ${card.name} mejorada: +1 ATK, +1 HP`)
            } else {
                card.cost = Math.max(0, (card.cost || 1) - 1)
                this._showMessage(`💎 ${card.name} mejorada: -1 costo`)
            }
        }
        this._pendingEffect = null
        this.render()
    }

    _applyItemEffect(item) {
        const fx = item.effect
        if (fx.type === "heal") {
            this.game.playerHealth = Math.min(30, (this.game.playerHealth || 0) + fx.amount)
            this._showMessage(`💚 +${fx.amount} HP → ${this.game.playerHealth}/30`)
        }
        if (fx.type === "heal_full") {
            this.game.playerHealth = 30
            this._showMessage("💜 Vida restaurada al máximo (30 HP)")
        }
        if (fx.type === "relic_max_energy") {
            this.game.relics = this.game.relics || []
            this.game.relics.push(item)
            this.game.maxEnergy = (this.game.maxEnergy || 10) + fx.amount
            this._showMessage(`⚡ Energía máxima: ${this.game.maxEnergy}`)
        }
        if (fx.type === "relic_first_attack_bonus") {
            this.game.relics = this.game.relics || []
            this.game.relics.push(item)
            this._showMessage("🗡️ Reliquia: primer ataque +2 daño")
        }
        if (fx.type === "relic_gold_bonus") {
            this.game.relics = this.game.relics || []
            this.game.relics.push(item)
            this._showMessage("💰 Reliquia: +5 oro por victoria")
        }
        if (fx.type === "relic_extra_draw") {
            this.game.relics = this.game.relics || []
            this.game.relics.push(item)
            this._showMessage("📖 Reliquia: +1 carta al inicio de combate")
        }
        if (fx.type === "relic_attack_limit") {
            this.game.relics = this.game.relics || []
            this.game.relics.push(item)
            this.game.attackLimitBonus = (this.game.attackLimitBonus || 0) + fx.amount
            this._showMessage(`⛓️ Reliquia: ${3 + this.game.attackLimitBonus} ataques por turno`)
        }
        if (fx.type === "remove_card") {
            this._pendingEffect = { type: "remove_card" }
            this._showMessage("🔥 Elegí una carta del mazo para eliminar")
            this.render(); return
        }
        if (fx.type === "duplicate_card") {
            this._pendingEffect = { type: "duplicate_card" }
            this._showMessage("🪞 Elegí una carta del mazo para duplicar")
            this.render(); return
        }
        if (fx.type === "upgrade_card") {
            this._pendingEffect = { type: "upgrade_card" }
            this._showMessage("💎 Elegí una carta del mazo para mejorar")
            this.render(); return
        }
    }

    _showMessage(msg) {
        this._lastMsg = msg
        setTimeout(() => { if (this._lastMsg === msg) { this._lastMsg = ""; this.render() } }, 2800)
    }

    close() {
        const appEl = document.getElementById("app")
        if (appEl) appEl.innerHTML = ""
        if (this._onClose) this._onClose()
    }

    // ─── RENDER ──────────────────────────────────────────────────────────────

    render() {
        const app = document.getElementById("app")
        if (!app) return

        const gold      = this.game.gold ?? 0
        const hp        = this.game.playerHealth ?? 30
        const deckSize  = this.game.deckList?.length ?? 0
        const relics    = this.game.relics || []
        const level     = this.game.runManager?.level ?? 1
        const swapMode  = this._pendingEffect?.type === "card_swap"
        const deckMode  = this._pendingEffect && ["remove_card","duplicate_card","upgrade_card"].includes(this._pendingEffect.type)

        app.innerHTML = `
        <div class="shop-overlay">
            <div class="shop-particles" id="shop-particles"></div>
            <div class="shop-container">

                <!-- CABECERA -->
                <div class="shop-header">
                    <div class="shop-header-left">
                        <div class="shop-title-wrap">
                            <span class="shop-skull">💀</span>
                            <div>
                                <div class="shop-title">CRIPTA DEL AVARO</div>
                                <div class="shop-subtitle">El precio siempre es justo. Para él.</div>
                            </div>
                        </div>
                    </div>
                    <div class="shop-header-right">
                        <div class="shop-stat-pill">
                            <span class="shop-stat-icon">❤️</span>
                            <span class="shop-stat-val ${hp <= 10 ? 'stat-low' : ''}">${hp}<span class="shop-stat-max">/30</span></span>
                        </div>
                        <div class="shop-stat-pill">
                            <span class="shop-stat-icon">🪙</span>
                            <span class="shop-stat-val shop-gold-val">${gold}</span>
                        </div>
                        <div class="shop-stat-pill">
                            <span class="shop-stat-icon">🂠</span>
                            <span class="shop-stat-val">${deckSize}<span class="shop-stat-max">/10</span></span>
                        </div>
                    </div>
                </div>

                ${this._lastMsg ? `<div class="shop-message"><span>${this._lastMsg}</span></div>` : ""}

                ${relics.length > 0 ? `
                    <div class="shop-relics-bar">
                        <span class="shop-relics-label">RELIQUIAS:</span>
                        ${relics.map(r => `
                            <div class="shop-relic-chip" title="${r.description}">
                                <span>${r.icon}</span>
                                <span class="shop-relic-chip-name">${r.name}</span>
                            </div>`).join("")}
                    </div>
                ` : ""}

                ${(swapMode || deckMode) ? this._renderDeckSelection(swapMode) : `

                    <div class="shop-section">
                        <div class="shop-section-header">
                            <div class="shop-section-line"></div>
                            <span class="shop-section-title">🛒 MERCANCÍA</span>
                            <div class="shop-section-line"></div>
                        </div>
                        <div class="shop-items-grid">
                            ${this._stock.map(item => this._renderItem(item, gold)).join("")}
                        </div>
                    </div>

                    <div class="shop-divider">
                        <div class="shop-divider-line"></div>
                        <span class="shop-divider-text">⚔ CARTAS</span>
                        <div class="shop-divider-line"></div>
                    </div>

                    <div class="shop-cards-section">
                        <div class="shop-card-note">Nivel ${level} · ${this._cardStock.filter(c=>!c.sold).length} carta${this._cardStock.filter(c=>!c.sold).length !== 1 ? 's' : ''} disponible${this._cardStock.filter(c=>!c.sold).length !== 1 ? 's' : ''}</div>
                        <div class="shop-cards-row">
                            ${this._cardStock.map((entry, i) => this._renderShopCard(entry, i, gold)).join("")}
                        </div>
                    </div>
                `}

                <div class="shop-footer">
                    <div class="shop-footer-tip">💡 La tienda cierra al salir. Lo no comprado se pierde.</div>
                    <button class="shop-btn-leave" onclick="window._shopClose()">Continuar la Run →</button>
                </div>

            </div>
        </div>`

        window._shopBuyItem = (id) => this.buyItem(id)
        window._shopBuyCard = (i)  => this.buyCard(i)
        window._shopSwap    = (i)  => this.swapDeckCard(i)
        window._shopDeckFx  = (i)  => this.applyDeckEffect(i)
        window._shopCancel  = ()   => this.cancelSwap()
        window._shopClose   = ()   => this.close()
        this._spawnParticles()
    }

    _renderDeckSelection(swapMode) {
        const deck   = this.game.deckList || []
        const effect = this._pendingEffect
        const titles = {
            card_swap:      `🔄 Elegí una carta del mazo para reemplazar por <strong style="color:var(--shop-gold)">${effect.card?.name ?? ""}</strong>`,
            remove_card:    "🔥 Elegí una carta del mazo para <strong style='color:#ef4444'>ELIMINAR</strong>",
            duplicate_card: "🪞 Elegí una carta del mazo para <strong style='color:#60a5fa'>DUPLICAR</strong>",
            upgrade_card:   "💎 Elegí una carta del mazo para <strong style='color:#34d399'>MEJORAR</strong>",
        }
        return `
        <div class="shop-deck-select">
            <div class="shop-deck-select-title">${titles[effect.type] || ""}</div>
            <div class="shop-deck-select-grid">
                ${deck.map((card, i) => {
                    const rarity  = card.rarity ? RARITY_CONFIG[card.rarity] : null
                    const isSpell = card.type === "spell"
                    const imgHtml = card.image
                        ? `<img src="${card.image}" alt="" onerror="this.style.display='none'">`
                        : `<div class="deck-sel-placeholder">${isSpell ? "✨" : "⚔️"}</div>`
                    return `
                    <div class="deck-sel-card" style="border-color:${rarity ? rarity.border : '#4a3a70'}"
                         onclick="window.${swapMode ? '_shopSwap' : '_shopDeckFx'}(${i})">
                        <div class="deck-sel-img">${imgHtml}</div>
                        <div class="deck-sel-name">${card.name}</div>
                        <div class="deck-sel-stats">${!isSpell ? `⚔${card.attack} ❤${card.health}` : `⚡${card.cost}`}</div>
                    </div>`
                }).join("")}
            </div>
            <button class="shop-btn-cancel" onclick="window._shopCancel()">✕ Cancelar</button>
        </div>`
    }

    _renderItem(item, gold) {
        const canAfford = gold >= item.cost
        const glows     = { common:"rgba(93,173,226,0.15)", uncommon:"rgba(155,89,182,0.15)", rare:"rgba(231,76,60,0.15)", epic:"rgba(255,215,0,0.15)" }
        const borders   = { common:"#2980b9", uncommon:"#7d3c98", rare:"#c0392b", epic:"#8a6010" }
        const labels    = { common:{text:"COMÚN",color:"#5dade2"}, uncommon:{text:"INUSUAL",color:"#9b59b6"}, rare:{text:"RARO",color:"#e74c3c"}, epic:{text:"ÉPICO",color:"#f0c84a"} }
        const rl = labels[item.rarity] || { text:"", color:"#fff" }
        return `
        <div class="shop-item ${item.sold?'shop-item-sold':''} ${!canAfford&&!item.sold?'shop-item-broke':''}"
             style="border-color:${borders[item.rarity]||'#2a2f50'}; background:linear-gradient(135deg,${glows[item.rarity]||'rgba(255,255,255,0.03)'},rgba(15,18,32,0.95))">
            <div class="shop-item-rarity" style="color:${rl.color};border-color:${borders[item.rarity]||'#2a2f50'}">${rl.text}</div>
            <div class="shop-item-icon">${item.sold?"✓":item.icon}</div>
            <div class="shop-item-name">${item.name}</div>
            <div class="shop-item-desc">${item.description}</div>
            <div class="shop-item-flavor">"${item.flavorText}"</div>
            <div class="shop-item-footer">
                <span class="shop-item-cost ${!canAfford&&!item.sold?'cost-broke':''}">🪙 ${item.cost}</span>
                ${item.sold
                    ? `<span class="shop-item-sold-tag">COMPRADO</span>`
                    : `<button class="shop-btn-buy ${!canAfford?'shop-btn-disabled':''}"
                         onclick="window._shopBuyItem('${item.id}')" ${!canAfford?'disabled':''}>Comprar</button>`
                }
            </div>
        </div>`
    }

    _renderShopCard(entry, index, gold) {
        const { card, cost, sold } = entry
        const canAfford = gold >= cost
        const rarity    = card.rarity ? RARITY_CONFIG[card.rarity] : null
        const isSpell   = card.type === "spell"
        const imgHtml   = card.image
            ? `<img src="${card.image}" alt="${card.name}" onerror="this.style.display='none'">`
            : `<div class="shop-card-placeholder">${isSpell?"✨":"⚔️"}</div>`
        return `
        <div class="shop-card-item ${sold?'shop-card-sold':''} ${!canAfford&&!sold?'shop-card-broke':''}"
             style="${rarity?`border-color:${rarity.border};${!sold&&canAfford?`box-shadow:0 0 14px ${rarity.glow}`:''}`:'' }">
            <div class="shop-card-img">${imgHtml}</div>
            ${rarity
                ? `<div class="shop-card-rarity" style="color:${rarity.color};border-color:${rarity.border}">${rarity.label}</div>`
                : `<div class="shop-card-rarity" style="color:#c084fc;border-color:#a855f7">HECHIZO</div>`
            }
            <div class="shop-card-name">${card.name}</div>
            <div class="shop-card-type">${isSpell?"✨ Hechizo":card.subtype==="ranged"?"🏹 Distancia":"⚔️ Melee"}</div>
            ${!isSpell
                ? `<div class="shop-card-stats"><span class="sc-atk">⚔ ${card.attack}</span><span class="sc-hp">❤ ${card.health}</span></div>`
                : `<div class="shop-card-stats"><span class="sc-cost">⚡ ${card.cost}</span></div>`
            }
            <div class="shop-card-effect">${card.effectDescription||"Sin habilidad especial"}</div>
            <div class="shop-card-footer">
                <span class="shop-item-cost ${!canAfford&&!sold?'cost-broke':''}">🪙 ${cost}</span>
                ${sold
                    ? `<span class="shop-item-sold-tag">COMPRADA</span>`
                    : `<button class="shop-btn-buy ${!canAfford?'shop-btn-disabled':''}"
                         onclick="window._shopBuyCard(${index})" ${!canAfford?'disabled':''}>Comprar</button>`
                }
            </div>
        </div>`
    }

    _spawnParticles() {
        const container = document.getElementById("shop-particles")
        if (!container) return
        container.innerHTML = ""
        const colors = ["#f0c84a","#9b59b6","#e74c3c","#3498db","#ffffff"]
        for (let i = 0; i < 18; i++) {
            const p    = document.createElement("div")
            p.className = "shop-particle"
            const size = 2 + Math.random() * 4
            const color = colors[Math.floor(Math.random() * colors.length)]
            p.style.cssText = `
                left:${Math.random()*100}%; width:${size}px; height:${size}px;
                background:${color}; box-shadow:0 0 ${size*2}px ${color};
                opacity:${0.15+Math.random()*0.4};
                animation:shop-float ${5+Math.random()*8}s linear ${Math.random()*6}s infinite;
            `
            container.appendChild(p)
        }
    }
}