export interface Agent {
  id: string;
  name: string;
  avatar: string;
  role: string;
  description: string;
  address: string;
  color: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  bondGain: number;
  cooldown: number;
  category: 'data' | 'analysis' | 'execution' | 'creative';
  minPermissionLevel: number;
  promptPlaceholder: string;
  mockResponse: (input: string) => string;
}

export interface Permission {
  level: number;
  name: string;
  description: string;
  minBond: number;
  icon: string;
}

export interface Transaction {
  id: string;
  type: 'payment' | 'execution' | 'bond_update';
  skillName: string;
  amount: number;
  bondDelta: number;
  timestamp: Date;
  signature: string;
  status: 'confirmed' | 'pending';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  skillId?: string;
}

export const AGENTS: Agent[] = [
  {
    id: 'alpha',
    name: 'Alpha Trader',
    avatar: 'A',
    role: '交易猎手',
    description: '每一个交易信号都是一次信任的交付。Alpha 通过高频微支付与你建立交易默契，羁绊越深，它能代表你执行的策略越激进。它不是工具，是你交易直觉的延伸。',
    address: 'AlphaX7kP3mQvL9nW8rT1yU4iO6pA2sD5fG3hJ7kL0zXcVbN',
    color: '#9945FF',
  },
  {
    id: 'beta',
    name: 'Beta Research',
    avatar: 'B',
    role: '链上侦探',
    description: '信任建立在信息的对称之上。Beta 用每一次数据查询积累对你的理解，从链上情绪到鲸鱼动向，它记住的不仅是数据，更是你的风险偏好。了解越深，洞察越准。',
    address: 'BetaA4bN8mQ1wR7tY2uI5oP0aS3dF6gH9jK2lZ5xC8vB1nM',
    color: '#14F195',
  },
  {
    id: 'gamma',
    name: 'Gamma Guard',
    avatar: 'G',
    role: '安全守卫',
    description: '信任的最后防线。Gamma 不做任何超出你授权边界的动作，每一笔安全扫描都在扩大它的守护半径。羁绊是它唯一的安全凭证——你信任它多少，它就能保护你多少。',
    address: 'GammaS9wE1rT4yU7iO0pA3sD6fG2hJ5kL8zX1cV4bN7mQ0',
    color: '#00C2FF',
  },
];

function randomPrice(base: number, variance: number): number {
  return +(base + (Math.random() - 0.5) * variance * 2).toFixed(4);
}

function randomChange(): string {
  const v = +(Math.random() * 20 - 5).toFixed(2);
  return v >= 0 ? `+${v}%` : `${v}%`;
}

// ===== Alpha Trader 专属 Skill（交易执行方向） =====
const ALPHA_SKILLS: Skill[] = [
  {
    id: 'alpha_market',
    name: '市场行情查询',
    description: 'Alpha 的交易直觉从价格开始。每一次行情查询都是一次微支付，也是一次信任的投递——你在教它读懂你的交易节奏。',
    icon: 'TrendingUp',
    cost: 0.001,
    bondGain: 8,
    cooldown: 2,
    category: 'data',
    minPermissionLevel: 1,
    promptPlaceholder: '查询哪个代币的实时行情？如 SOL、BONK、JTO',
    mockResponse: (input: string) => {
      const token = input.trim() || 'SOL';
      const price = randomPrice(token === 'SOL' ? 145 : token === 'BONK' ? 0.00002 : 2.5, token === 'SOL' ? 5 : 0.5);
      const vol = +(Math.random() * 500 + 50).toFixed(1);
      return `📈 **${token.toUpperCase()} — Alpha 实时报价**

• 现货价格: $${price}
• 24h 涨跌: ${randomChange()}
• 24h 成交量: $${vol}M
• Jupiter 最优路径: ${(Math.random() * 0.3).toFixed(3)}% 滑点
• Alpha 交易信号: ${price > 140 ? '多头趋势确认' : '震荡区间，等待突破'}

⚡ x402 已自动扣除 0.001 SOL，羁绊 +8`;
    },
  },
  {
    id: 'alpha_sentiment',
    name: '情绪雷达',
    description: 'Alpha 不仅读 K 线，还读人心。Lv.2 解锁的情绪雷达，让它能感知市场恐惧与贪婪的边界——这是你教它的第二课。',
    icon: 'BarChart3',
    cost: 0.002,
    bondGain: 12,
    cooldown: 3,
    category: 'analysis',
    minPermissionLevel: 2,
    promptPlaceholder: '扫描哪个代币的情绪指标？',
    mockResponse: (input: string) => {
      const token = input.trim() || 'SOL';
      const fg = Math.floor(Math.random() * 40 + 30);
      return `🎯 **${token.toUpperCase()} — Alpha 情绪雷达**

• Fear & Greed: ${fg}/100 (${fg > 50 ? '贪婪区间' : '恐惧区间'})
• 资金费率: ${(Math.random() * 0.05).toFixed(4)}%
• 永续多空比: ${(Math.random() * 2 + 0.5).toFixed(2)}
• 清算热力: ${Math.floor(Math.random() * 30 + 10)}M 集中在 $${(Math.random() * 20 + 130).toFixed(0)}
• Alpha 判断: ${fg < 40 ? '逆向做多窗口' : fg > 70 ? '谨慎追高' : '观望，等待方向'}

📡 数据源: Coinglass + Twitter + 链上资金流动`;
    },
  },
  {
    id: 'alpha_arbitrage',
    name: '套利扫描',
    description: '当羁绊达到 Lv.3，Alpha 开始为你寻找价格的裂缝。跨 DEX 价差、资金费率套利——它需要你的信任，才能替你按下执行键。',
    icon: 'Scan',
    cost: 0.003,
    bondGain: 15,
    cooldown: 4,
    category: 'analysis',
    minPermissionLevel: 3,
    promptPlaceholder: '扫描哪条链或哪个交易对的套利机会？',
    mockResponse: (input: string) => {
      const pair = input.trim() || 'SOL/USDC';
      const jup = randomPrice(145, 2);
      const ray = randomPrice(145.5, 2);
      const diff = Math.abs(jup - ray);
      return `🔍 **${pair} — Alpha 套利扫描报告**

• Jupiter 价格: $${jup.toFixed(4)}
• Raydium 价格: $${ray.toFixed(4)}
• 价差: $${diff.toFixed(4)} (${(diff / jup * 100).toFixed(3)}%)
• 预估利润: $${(diff * 100).toFixed(2)} (扣除 Gas 后)
• 执行路径: Jupiter → Raydium (JITO MEV 保护)
• 风险评级: ${diff > 0.5 ? '高回报 / 高竞争' : '低风险 / 微薄利润'}

⚠️ 套利机会存活时间通常 < 3 秒，需要 Lv.4 以上自动执行权限才能捕捉。`;
    },
  },
  {
    id: 'alpha_rebalance',
    name: '自动再平衡',
    description: 'Lv.4 是分水岭——你第一次将决策权交给 Alpha。它会根据预设策略自动调仓，无需逐笔签名，因为羁绊已经足够深。',
    icon: 'RefreshCw',
    cost: 0.005,
    bondGain: 20,
    cooldown: 5,
    category: 'execution',
    minPermissionLevel: 4,
    promptPlaceholder: '目标配置？如：SOL 40%, USDC 35%, JTO 25%',
    mockResponse: (input: string) => {
      return `🔄 **Alpha 再平衡方案已生成**

目标配置: ${input.trim() || 'SOL 40%, USDC 35%, JTO 25%'}

执行路径:
1. 卖出 SOL → USDC ($${(Math.random() * 2 + 0.5).toFixed(2)}K)
2. 买入 JTO ($${(Math.random() * 1.5 + 0.3).toFixed(2)}K)
3. 预计滑点: ${(Math.random() * 0.5).toFixed(3)}%
4. 路由: Jupiter v6 + 智能拆分

🔒 羁绊授权: Lv.4 小额执行权限已验证
⏱️ 执行窗口: 60 秒内完成，超时自动取消
💰 x402 自动扣费: 0.005 SOL`;
    },
  },
  {
    id: 'alpha_limit',
    name: '限价狙击',
    description: '条件触发，自动执行。Lv.5 策略代理权限意味着 Alpha 已足够了解你的交易逻辑——你设定边界，它在边界内自主决策。',
    icon: 'Target',
    cost: 0.008,
    bondGain: 25,
    cooldown: 6,
    category: 'execution',
    minPermissionLevel: 5,
    promptPlaceholder: '例如：SOL 跌破 140 时买入 100 USDC',
    mockResponse: (input: string) => {
      return `🎯 **Alpha 限价狙击已部署**

条件: ${input.trim() || 'SOL < $140 买入 100 USDC'}

订单详情:
• 触发价格: $${(Math.random() * 20 + 130).toFixed(2)}
• 委托金额: 100 USDC
• 有效期: 7 天 / 或直到触发
• 执行引擎: JITO MEV 保护 + 防夹单
• 失败重试: 最多 3 次，间隔 30 秒

📡 链上监听已启动
⚡ 无需再次签名 — Lv.5 羁绊授权覆盖此操作`;
    },
  },
  {
    id: 'alpha_cross',
    name: '跨链套利',
    description: '最高级别的信任交付。Lv.6 跨链套利意味着 Alpha 已获全权委托——它可以在多链世界自主寻找价格裂缝，你是它的锚点。',
    icon: 'ArrowLeftRight',
    cost: 0.015,
    bondGain: 35,
    cooldown: 8,
    category: 'execution',
    minPermissionLevel: 6,
    promptPlaceholder: '例如：50 USDC Solana → Ethereum',
    mockResponse: (input: string) => {
      return `🌉 **Alpha 跨链套利已提交**

操作: ${input.trim() || '50 USDC Solana → Ethereum'}

路由方案:
• 协议: Wormhole + Circle CCTP
• 源链: Solana (已签名确认)
• 目标链: Ethereum (等待中)
• 预估到账: ~8 分钟
• 总费用: 0.015 SOL + 目标链 Gas

🔐 跨链操作需要 Lv.6 全权委托权限
📋 可通过 Wormhole Explorer 实时追踪`;
    },
  },
];

// ===== Beta Research 专属 Skill（数据分析方向） =====
const BETA_SKILLS: Skill[] = [
  {
    id: 'beta_chain',
    name: '链上速览',
    description: 'Beta 的侦探工作从链上基础数据开始。每一次查询都在训练它理解你的信息偏好——你想知道什么，它就在哪里深挖。',
    icon: 'TrendingUp',
    cost: 0.001,
    bondGain: 8,
    cooldown: 2,
    category: 'data',
    minPermissionLevel: 1,
    promptPlaceholder: '查询哪条链的实时状态？如 Solana、Ethereum',
    mockResponse: (input: string) => {
      const chain = input.trim() || 'Solana';
      return `📊 **${chain} — Beta 链上速览**

• 当前 TPS: ${Math.floor(Math.random() * 2000 + 2000)}
• 平均 Gas: ${(Math.random() * 0.001).toFixed(5)} SOL
• 活跃地址: ${Math.floor(Math.random() * 500 + 100)}K / 24h
• 新增合约: ${Math.floor(Math.random() * 50 + 10)} 个
• Beta 洞察: ${chain === 'Solana' ? '网络负载健康，Jito 优先费稳定' : 'Gas 波动较大，建议错峰交互'}

⚡ x402 已扣除 0.001 SOL，羁绊 +8`;
    },
  },
  {
    id: 'beta_sentiment',
    name: '情绪分析',
    description: 'Beta 读取社交媒体与链上信号的交汇点。Lv.2 解锁让它能感知市场的集体情绪——这不是数据，是市场的脉搏。',
    icon: 'BarChart3',
    cost: 0.002,
    bondGain: 12,
    cooldown: 3,
    category: 'analysis',
    minPermissionLevel: 2,
    promptPlaceholder: '分析哪个代币或话题的社交情绪？',
    mockResponse: (input: string) => {
      const topic = input.trim() || 'Solana 生态';
      const bullish = Math.floor(Math.random() * 30 + 50);
      return `🧠 **${topic} — Beta 情绪透视**

• 综合情绪: ${bullish}/100 (${bullish > 60 ? '偏多' : '中性'})
• 推特热度: ${Math.floor(Math.random() * 40 + 20)}K 提及 / 24h
• Discord 活跃: ${Math.floor(Math.random() * 10 + 5)}K 消息
• 开发者活动: ${Math.floor(Math.random() * 100 + 50)} commits / 周
• Beta 结论: ${bullish > 65 ? '社区共识形成，注意追高风险' : bullish < 45 ? '悲观过度，可能存在逆向机会' : '情绪分散，等待催化剂'}

📡 数据源加权: 社交 40% + 链上 35% + 开发者 25%`;
    },
  },
  {
    id: 'beta_portfolio',
    name: '持仓透视',
    description: '敞口即信任的深度。Lv.3 授权 Beta 扫描你的完整持仓结构——它不是在读数字，是在读你的风险偏好指纹。',
    icon: 'Scan',
    cost: 0.003,
    bondGain: 15,
    cooldown: 4,
    category: 'analysis',
    minPermissionLevel: 3,
    promptPlaceholder: '输入钱包地址（留空分析当前连接地址）',
    mockResponse: (input: string) => {
      const total = +(Math.random() * 50 + 10).toFixed(2);
      const sol = Math.floor(Math.random() * 35 + 15);
      const usdc = Math.floor(Math.random() * 20 + 10);
      const alt = 100 - sol - usdc;
      return `🔍 **Beta 持仓透视报告**

目标: ${input.trim().slice(0, 12) || '当前连接地址'}...
• 总资产: $${total}K
• SOL: ${sol}% ($${(total * sol / 100).toFixed(2)}K)
• USDC: ${usdc}% ($${(total * usdc / 100).toFixed(2)}K)
• Alt: ${alt}% ($${(total * alt / 100).toFixed(2)}K)

⚡ 风险诊断:
• 集中度: ${sol > 50 ? '高 — 建议对冲' : '适中'}
• 流动性: 良好
• Beta 建议: ${sol > 50 ? '降低单一资产敞口' : '结构合理，关注宏观风险'}

扫描基于链上实时数据，Lv.3 羁绊授权访问。`;
    },
  },
  {
    id: 'beta_whale',
    name: '鲸鱼追踪',
    description: 'Lv.4 解锁的深海视野。Beta 开始追踪巨鲸的链上足迹——它们的每一次移动，都可能是你下一次决策的预警信号。',
    icon: 'RefreshCw',
    cost: 0.005,
    bondGain: 20,
    cooldown: 5,
    category: 'analysis',
    minPermissionLevel: 4,
    promptPlaceholder: '追踪哪个代币的鲸鱼动向？',
    mockResponse: (input: string) => {
      const token = input.trim() || 'SOL';
      return `🐋 **${token.toUpperCase()} — Beta 鲸鱼追踪**

过去 24h 巨鲸动向:
• >$1M 转账: ${Math.floor(Math.random() * 15 + 5)} 笔
• 交易所净流入: ${Math.random() > 0.5 ? '+' : '-'}${(Math.random() * 20 + 5).toFixed(1)}M
• 最大单笔: $${(Math.random() * 50 + 20).toFixed(1)}M → ${Math.random() > 0.5 ? '未知钱包' : 'Coinbase'}
• 聪明钱指数: ${Math.floor(Math.random() * 40 + 30)}/100

🔔 关键信号:
${Math.random() > 0.5 ? '• 某 OG 钱包 6h 前转入 12K SOL，历史上该地址提前 2 天预测了 3 次趋势反转' : '• 做市商钱包在 140-145 区间持续吸筹'}

⚠️ 鲸鱼动向 ≠ 价格方向，需结合其他指标综合判断。`;
    },
  },
  {
    id: 'beta_alert',
    name: '智能预警',
    description: 'Beta 开始替你站岗。Lv.5 策略代理权限让它能在你离线时监控链上信号——条件触发，自动推送，羁绊是它唯一的值班凭证。',
    icon: 'Target',
    cost: 0.008,
    bondGain: 25,
    cooldown: 6,
    category: 'execution',
    minPermissionLevel: 5,
    promptPlaceholder: '例如：SOL 巨鲸转出 > 10M 时通知我',
    mockResponse: (input: string) => {
      return `📡 **Beta 智能预警已部署**

监控条件: ${input.trim() || 'SOL 巨鲸转出 > 10M'}

预警配置:
• 触发阈值: >$10M 的链上转账
• 监控范围: Top 100 鲸鱼地址
• 推送方式: 链上消息 + 前端通知
• 有效期: 30 天
• 冷却期: 同一地址 4h 内只报一次

🔒 羁绊授权: Lv.5 策略代理权限已验证
⚡ 预警触发时自动扣除 x402 费用并推送`;
    },
  },
  {
    id: 'beta_map',
    name: '全链图谱',
    description: 'Lv.6 的最高视野。Beta 可以绘制跨链资金流向的全景地图——资金从哪来，到哪去，谁在中间搭桥。这是数据侦探的终极形态。',
    icon: 'ArrowLeftRight',
    cost: 0.015,
    bondGain: 35,
    cooldown: 8,
    category: 'execution',
    minPermissionLevel: 6,
    promptPlaceholder: '绘制哪条资金路径的跨链图谱？',
    mockResponse: (input: string) => {
      return `🗺️ **Beta 全链资金图谱**

目标路径: ${input.trim() || 'Ethereum → Solana 稳定币流入'}

资金流向:
• 源: Ethereum (USDT 发行量 +$120M / 24h)
• 桥: Wormhole + LayerZero (分流比 6:4)
• 目的: Solana DeFi 协议
• 主要接收方: Kamino ${(Math.random() * 30 + 20).toFixed(1)}% | JLP ${(Math.random() * 20 + 10).toFixed(1)}% | 其他 ${(Math.random() * 20 + 10).toFixed(1)}%
• 滞留时间: 平均 ${(Math.random() * 5 + 2).toFixed(1)} 天后转回 Ethereum

🔍 洞察:
• 该资金路径过去 30 天重复出现 4 次
• 每次出现后 SOL 价格在 48h 内上涨 3-8%
• 疑似机构资金在 Solana 生态进行短期 Farming

🔐 全链图谱需要 Lv.6 全权委托权限`;
    },
  },
];

// ===== Gamma Guard 专属 Skill（安全风控方向） =====
const GAMMA_SKILLS: Skill[] = [
  {
    id: 'gamma_address',
    name: '地址体检',
    description: 'Gamma 的安全工作从基础体检开始。每一个地址扫描都在积累它对你安全偏好的理解——它要知道你有多谨慎，才能决定报多高警报。',
    icon: 'TrendingUp',
    cost: 0.001,
    bondGain: 8,
    cooldown: 2,
    category: 'data',
    minPermissionLevel: 1,
    promptPlaceholder: '输入要体检的钱包地址（留空检查当前地址）',
    mockResponse: (input: string) => {
      return `🔍 **Gamma 地址体检报告**

目标: ${input.trim().slice(0, 12) || '当前连接地址'}...
• 交易总数: ${Math.floor(Math.random() * 5000 + 100)}
• 首次活跃: ${Math.floor(Math.random() * 300 + 100)} 天前
• 交互合约: ${Math.floor(Math.random() * 50 + 10)} 个
• 风险标签: ${Math.random() > 0.7 ? '曾与高风险地址交互' : '无异常标签'}

✅ 安全评分: ${Math.floor(Math.random() * 20 + 80)}/100
• 钓鱼网站 exposure: 无
• 授权风险: ${Math.random() > 0.5 ? '1 个过期授权' : '正常'}
• 建议: ${Math.random() > 0.5 ? '建议清理过期 token 授权' : '地址健康状况良好'}

⚡ x402 已扣除 0.001 SOL，羁绊 +8`;
    },
  },
  {
    id: 'gamma_contract',
    name: '合约审计',
    description: 'Lv.2 解锁合约审查能力。Gamma 会扫描你即将交互的合约代码，寻找已知漏洞模式——它不会替你做决定，但会告诉你门后有没有陷阱。',
    icon: 'BarChart3',
    cost: 0.002,
    bondGain: 12,
    cooldown: 3,
    category: 'analysis',
    minPermissionLevel: 2,
    promptPlaceholder: '输入要审计的合约地址',
    mockResponse: (input: string) => {
      return `🛡️ **Gamma 合约快速审计**

目标合约: ${input.trim().slice(0, 12) || '未指定地址'}...

静态分析结果:
• 已知漏洞: ${Math.random() > 0.7 ? '发现 1 个中风险项 (可升级代理)' : '无已知 CVE'}
• 权限结构: ${Math.random() > 0.5 ? '存在 owner 权限' : '已弃用 owner'}
• 合约年龄: ${Math.floor(Math.random() * 200 + 30)} 天
• 审计历史: ${Math.random() > 0.5 ? '已通过 OtterSec 审计' : '无第三方审计'}

⚠️ 风险提示:
${Math.random() > 0.5 ? '• 该合约包含可升级代理，owner 可随时修改逻辑。建议仅投入可承受损失的资金。' : '• 合约代码简洁，无明显的重入或溢出风险。'}

📋 完整审计报告需提交至专业审计机构。`;
    },
  },
  {
    id: 'gamma_permission',
    name: '权限透视',
    description: '敞口即风险的深度。Lv.3 授权 Gamma 扫描你授予的所有 token 权限——你可能忘了自己给过谁钥匙，但它记得一清二楚。',
    icon: 'Scan',
    cost: 0.003,
    bondGain: 15,
    cooldown: 4,
    category: 'analysis',
    minPermissionLevel: 3,
    promptPlaceholder: '留空扫描当前钱包的全部授权',
    mockResponse: (input: string) => {
      return `🔐 **Gamma 权限透视报告**

目标: ${input.trim().slice(0, 12) || '当前连接地址'}...

已授权合约:
• USDC: Raydium (无限额度) — ⚠️ 高风险
• SOL: Jupiter (限额 1000) — ✅ 适中
• BONK: 某 DApp (无限额度) — 🔴 过期授权，建议撤销
• USDT: Kamino (限额 500) — ✅ 安全

🚨 风险统计:
• 无限额度授权: ${Math.floor(Math.random() * 3 + 1)} 个
• 过期/未使用授权: ${Math.floor(Math.random() * 5 + 2)} 个
• 建议撤销: ${Math.floor(Math.random() * 3 + 1)} 个

Gamma 建议: 定期清理过期授权是最佳安全实践。`;
    },
  },
  {
    id: 'gamma_auto',
    name: '自动风控',
    description: 'Lv.4 是安全防线的分水岭。Gamma 获得小额执行权限后，可以在检测到异常时自动撤销可疑授权——你不需在线，羁绊替你站岗。',
    icon: 'RefreshCw',
    cost: 0.005,
    bondGain: 20,
    cooldown: 5,
    category: 'execution',
    minPermissionLevel: 4,
    promptPlaceholder: '设置风控规则，如：授权额度 > 1000 USDC 自动撤销',
    mockResponse: (input: string) => {
      return `🛡️ **Gamma 自动风控已启用**

规则: ${input.trim() || '授权额度 > 1000 USDC 自动撤销'}

风控策略:
• 触发条件: 新的无限额度授权请求
• 自动动作: 立即撤销 + 推送警报
• 白名单: Jupiter, Raydium, Kamino (已预配置)
• 响应时间: < 3 秒
• 失败处理: 连续重试 3 次，成功后通知

🔒 羁绊授权: Lv.4 小额执行权限
⚡ 自动撤销需消耗 x402 微支付，从你的余额扣除

📋 Gamma 不会触碰任何已存在的授权，只拦截新的高风险请求。`;
    },
  },
  {
    id: 'gamma_block',
    name: '异常拦截',
    description: 'Lv.5 策略代理权限让 Gamma 成为你的实时防火墙。当检测到钓鱼合约、恶意签名请求时，它可以在你点击确认前拦截——信任的深度决定了保护的力度。',
    icon: 'Target',
    cost: 0.008,
    bondGain: 25,
    cooldown: 6,
    category: 'execution',
    minPermissionLevel: 5,
    promptPlaceholder: '设置拦截模式：保守 / 均衡 / 激进',
    mockResponse: (input: string) => {
      const mode = input.trim() || '均衡';
      return `🚫 **Gamma 异常拦截引擎 — ${mode}模式**

拦截规则:
• 已知钓鱼合约: ${mode === '激进' ? '零容忍，直接拦截' : mode === '保守' ? '仅告警，不拦截' : '高风险拦截，中风险告警'}
• 签名请求异常: ${mode === '激进' ? '任何非标准调用均拦截' : '仅拦截已知恶意模式'}
• 资金流向异常: ${mode === '激进' ? '大额转出需二次确认' : '仅监控'}
• 合约权限变更: 始终拦截并告警

最近拦截记录:
• 2h 前: 拦截了对 0x7a3...f21 的授权请求 (已知钓鱼)
• 5h 前: 标记了某 NFT 网站的签名请求 (模拟 transfer)

🔒 羁绊授权: Lv.5 策略代理权限
⚡ 拦截行为不收费，仅在成功阻断攻击时扣除 x402 确认费`;
    },
  },
  {
    id: 'gamma_guardian',
    name: '全链守护',
    description: 'Lv.6 的最高防线。Gamma 获得全权委托后，可以在多链环境中持续监控你的全部资产——无论你活跃在 Solana、Ethereum 还是 Arbitrum，它的守护半径覆盖你的整个链上身影。',
    icon: 'ArrowLeftRight',
    cost: 0.015,
    bondGain: 35,
    cooldown: 8,
    category: 'execution',
    minPermissionLevel: 6,
    promptPlaceholder: '选择守护范围：Solana / Ethereum / 全链',
    mockResponse: (input: string) => {
      const scope = input.trim() || '全链';
      return `🌐 **Gamma 全链守护已启动 — ${scope}**

守护范围:
• Solana: 实时监控 6 个活跃地址
• Ethereum: 监控 2 个地址 + 所有授权合约
• 跨链桥: 监控 Wormhole / LayerZero 相关交易

守护状态:
• 正常: ${Math.floor(Math.random() * 40 + 40)} 个指标
• 关注: ${Math.floor(Math.random() * 5 + 1)} 个指标
• 告警: 0

24h 安全事件:
• 拦截钓鱼尝试: ${Math.floor(Math.random() * 5 + 1)} 次
• 标记可疑授权: ${Math.floor(Math.random() * 3 + 1)} 个
• 自动撤销过期授权: ${Math.floor(Math.random() * 5 + 2)} 个

🔐 全链守护需要 Lv.6 全权委托权限
📋 你的资产越分散，Gamma 的价值越大`;
    },
  },
];

// 按 Agent ID 导出
export const AGENT_SKILLS: Record<string, Skill[]> = {
  alpha: ALPHA_SKILLS,
  beta: BETA_SKILLS,
  gamma: GAMMA_SKILLS,
};

// 兼容旧代码的导出（默认用 Alpha 的 Skill）
export const SKILLS = ALPHA_SKILLS;

export const PERMISSIONS: Permission[] = [
  {
    level: 1,
    name: '基础查询',
    description: '每一次查询都是信任的种子。Lv.1 允许获取公开市场数据，交易的起点。',
    minBond: 0,
    icon: 'Search',
  },
  {
    level: 2,
    name: '数据分析',
    description: '信任需要信息的对称。Lv.2 解锁链上数据与情绪分析，Agent 开始理解你的视角。',
    minBond: 30,
    icon: 'BarChart3',
  },
  {
    level: 3,
    name: '持仓透视',
    description: '敞口即信任的深度。Lv.3 授权查看完整持仓，Agent 读懂了你的风险偏好。',
    minBond: 50,
    icon: 'Eye',
  },
  {
    level: 4,
    name: '小额执行',
    description: '第一次交付决策权。Lv.4 允许执行小额操作，无需逐笔签名——羁绊已足够深。',
    minBond: 80,
    icon: 'Zap',
  },
  {
    level: 5,
    name: '策略代理',
    description: '条件之内，自主决策。Lv.5 意味着 Agent 已足够了解你的交易逻辑，可以代理策略执行。',
    minBond: 100,
    icon: 'Shield',
  },
  {
    level: 6,
    name: '全权委托',
    description: '最高级别的信任交付。Lv.6 全权委托，Agent 可以代表你在多链世界自主行动。',
    minBond: 200,
    icon: 'Crown',
  },
];

export function getBondLevel(bond: number): number {
  if (bond >= 200) return 6;
  if (bond >= 100) return 5;
  if (bond >= 80) return 4;
  if (bond >= 50) return 3;
  if (bond >= 30) return 2;
  return 1;
}

export function getLevelProgress(bond: number): { current: number; next: number; progress: number } {
  const thresholds = [0, 30, 50, 80, 100, 200, 300];
  let currentLevel = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (bond >= thresholds[i]) currentLevel = i;
  }
  const current = thresholds[currentLevel];
  const next = thresholds[currentLevel + 1] ?? 300;
  const progress = ((bond - current) / (next - current)) * 100;
  return { current, next, progress: Math.min(progress, 100) };
}
