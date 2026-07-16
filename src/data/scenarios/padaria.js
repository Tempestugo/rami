/**
 * Cenário: A Padaria (面包店)
 * 
 * Cada nó do diálogo define o texto do NPC, o hanzi correspondente,
 * as intenções possíveis do usuário (com keywords esperadas em pinyin e hanzi),
 * e o próximo nó para cada intenção.
 */

export const padariaScenario = {
  id: 'padaria',
  title: 'A Padaria',
  titleZh: '面包店',
  description: 'Pratique comprar pão em chinês.',
  
  npcSchema: {
    canvas: { width: 480, height: 560 },
    style: { stroke: '#e8442b', strokeWidth: 2, roughness: 1.5 },
    elements: [
      // Corpo (rounded rectangle)
      { type: 'roundedRect', x: 120, y: 300, width: 240, height: 240, rx: 70 },
      
      // Cabeça
      { type: 'ellipse', cx: 240, cy: 180, rx: 90, ry: 100 },
      
      // Chapéu (base)
      { type: 'ellipse', cx: 240, cy: 90, rx: 110, ry: 25 },
      
      // Chapéu (topo)
      { type: 'ellipse', cx: 240, cy: 70, rx: 60, ry: 40 },
      
      // Olho esquerdo
      { type: 'ellipse', cx: 200, cy: 160, rx: 12, ry: 15 },
      
      // Olho direito
      { type: 'ellipse', cx: 280, cy: 160, rx: 12, ry: 15 },
      
      // Boca fechada (idle)
      { type: 'line', x1: 210, y1: 230, x2: 270, y2: 230, showOn: 'idle' },
      
      // Boca aberta (speaking)
      { type: 'ellipse', cx: 240, cy: 235, rx: 15, ry: 20, fill: '#e8442b', fillStyle: 'solid', showOn: 'speaking' }
    ]
  },
  
  nodes: {
    start: {
      id: 'start',
      npcText: 'Olá! Bem-vindo à padaria. O que você gostaria?',
      npcTextZh: '你好！欢迎光临面包店。您想要什么？',
      npcPinyin: 'Nǐ hǎo! Huānyíng guānglín miànbāo diàn. Nín xiǎng yào shénme?',
      intents: [
        {
          id: 'COMPRAR_PAO',
          keywordsZh: ['买','面包','要','个','一个'],
          keywordsPinyin: ['mai','mianbao','yao','ge','yige'],
          expectedResponses: ['我想买一个面包','我要买面包','我要一个面包'],
          nextNode: 'escolher_pao',
          hint: 'Tente dizer: "Wǒ xiǎng mǎi yí gè miànbāo" (我想买一个面包)'
        },
        {
          id: 'CUMPRIMENTAR',
          keywordsZh: ['你好','早','您好'],
          keywordsPinyin: ['nihao','zao','ninhao'],
          expectedResponses: ['你好','早上好','您好'],
          nextNode: 'start_cumprimento',
          hint: 'Tente dizer: "Nǐ hǎo" (你好)'
        }
      ]
    },

    start_cumprimento: {
      id: 'start_cumprimento',
      npcText: 'Bom dia! O que gostaria de comprar hoje?',
      npcTextZh: '早上好！您今天想买什么？',
      npcPinyin: 'Zǎoshang hǎo! Nín jīntiān xiǎng mǎi shénme?',
      intents: [
        {
          id: 'COMPRAR_PAO',
          keywordsZh: ['买','面包','要','个','一个'],
          keywordsPinyin: ['mai','mianbao','yao','ge','yige'],
          expectedResponses: ['我想买一个面包','我要买面包','我要一个面包'],
          nextNode: 'escolher_pao',
          hint: 'Tente dizer: "Wǒ xiǎng mǎi yí gè miànbāo" (我想买一个面包)'
        }
      ]
    },

    escolher_pao: {
      id: 'escolher_pao',
      npcText: 'Temos pão francês, pão doce e pão de queijo. Qual você quer?',
      npcTextZh: '我们有法式面包、甜面包和奶酪面包。您想要哪个？',
      npcPinyin: 'Wǒmen yǒu Fàshì miànbāo, tián miànbāo hé nǎilào miànbāo. Nín xiǎng yào nǎ ge?',
      intents: [
        {
          id: 'ESCOLHER_FRANCES',
          keywordsZh: ['法式','面包','法式面包','要','个'],
          keywordsPinyin: ['fashi','mianbao','fashimianbao','yao','ge'],
          expectedResponses: ['我要法式面包','我要一个法式面包','法式面包'],
          nextNode: 'confirmar_frances',
          hint: 'Tente dizer: "Wǒ yào Fàshì miànbāo" (我要法式面包)'
        },
        {
          id: 'ESCOLHER_DOCE',
          keywordsZh: ['甜','面包','甜面包','要','个'],
          keywordsPinyin: ['tian','mianbao','tianmianbao','yao','ge'],
          expectedResponses: ['我要甜面包','我要一个甜面包','甜面包'],
          nextNode: 'confirmar_doce',
          hint: 'Tente dizer: "Wǒ yào tián miànbāo" (我要甜面包)'
        },
        {
          id: 'ESCOLHER_QUEIJO',
          keywordsZh: ['奶酪','面包','奶酪面包','要','个'],
          keywordsPinyin: ['nailao','mianbao','nailaomianbao','yao','ge'],
          expectedResponses: ['我要奶酪面包','我要一个奶酪面包','奶酪面包'],
          nextNode: 'confirmar_queijo',
          hint: 'Tente dizer: "Wǒ yào nǎilào miànbāo" (我要奶酪面包)'
        },
        {
          id: 'PERGUNTAR_PRECO',
          keywordsZh: ['多少','钱','价格','贵','便宜'],
          keywordsPinyin: ['duoshao','qian','jiage','gui','pianyi'],
          expectedResponses: ['多少钱','这个多少钱','面包多少钱'],
          nextNode: 'precos',
          hint: 'Tente dizer: "Duōshao qián?" (多少钱?)'
        }
      ]
    },

    precos: {
      id: 'precos',
      npcText: 'Pão francês: 5 yuan. Pão doce: 4 yuan. Pão de queijo: 6 yuan.',
      npcTextZh: '法式面包五元。甜面包四元。奶酪面包六元。',
      npcPinyin: 'Fàshì miànbāo wǔ yuán. Tián miànbāo sì yuán. Nǎilào miànbāo liù yuán.',
      intents: [
        {
          id: 'ESCOLHER_FRANCES',
          keywordsZh: ['法式','面包','要','个'],
          keywordsPinyin: ['fashi','mianbao','yao','ge'],
          expectedResponses: ['我要法式面包','我要一个法式面包'],
          nextNode: 'confirmar_frances',
          hint: 'Tente dizer: "Wǒ yào Fàshì miànbāo" (我要法式面包)'
        },
        {
          id: 'ESCOLHER_DOCE',
          keywordsZh: ['甜','面包','要','个'],
          keywordsPinyin: ['tian','mianbao','yao','ge'],
          expectedResponses: ['我要甜面包','我要一个甜面包'],
          nextNode: 'confirmar_doce',
          hint: 'Tente dizer: "Wǒ yào tián miànbāo" (我要甜面包)'
        },
        {
          id: 'ESCOLHER_QUEIJO',
          keywordsZh: ['奶酪','面包','要','个'],
          keywordsPinyin: ['nailao','mianbao','yao','ge'],
          expectedResponses: ['我要奶酪面包','我要一个奶酪面包'],
          nextNode: 'confirmar_queijo',
          hint: 'Tente dizer: "Wǒ yào nǎilào miànbāo" (我要奶酪面包)'
        }
      ]
    },

    confirmar_frances: {
      id: 'confirmar_frances',
      npcText: 'Perfeito! Um pão francês. São 5 yuan. Vai pagar em dinheiro ou cartão?',
      npcTextZh: '好的！一个法式面包。五元。您要付现金还是刷卡？',
      npcPinyin: 'Hǎo de! Yí gè Fàshì miànbāo. Wǔ yuán. Nín yào fù xiànjīn háishì shuākǎ?',
      intents: [
        {
          id: 'PAGAR_DINHEIRO',
          keywordsZh: ['现金','钱','付','给'],
          keywordsPinyin: ['xianjin','qian','fu','gei'],
          expectedResponses: ['我付现金','我给现金','现金'],
          nextNode: 'pagamento_ok',
          hint: 'Tente dizer: "Wǒ fù xiànjīn" (我付现金)'
        },
        {
          id: 'PAGAR_CARTAO',
          keywordsZh: ['刷卡','卡','付'],
          keywordsPinyin: ['shuaka','ka','fu'],
          expectedResponses: ['我刷卡','刷卡','我刷卡付'],
          nextNode: 'pagamento_ok',
          hint: 'Tente dizer: "Wǒ shuākǎ" (我刷卡)'
        }
      ]
    },

    confirmar_doce: {
      id: 'confirmar_doce',
      npcText: 'Perfeito! Um pão doce. São 4 yuan. Vai pagar em dinheiro ou cartão?',
      npcTextZh: '好的！一个甜面包。四元。您要付现金还是刷卡？',
      npcPinyin: 'Hǎo de! Yí gè tián miànbāo. Sì yuán. Nín yào fù xiànjīn háishì shuākǎ?',
      intents: [
        {
          id: 'PAGAR_DINHEIRO',
          keywordsZh: ['现金','钱','付','给'],
          keywordsPinyin: ['xianjin','qian','fu','gei'],
          expectedResponses: ['我付现金','我给现金','现金'],
          nextNode: 'pagamento_ok',
          hint: 'Tente dizer: "Wǒ fù xiànjīn" (我付现金)'
        },
        {
          id: 'PAGAR_CARTAO',
          keywordsZh: ['刷卡','卡','付'],
          keywordsPinyin: ['shuaka','ka','fu'],
          expectedResponses: ['我刷卡','刷卡','我刷卡付'],
          nextNode: 'pagamento_ok',
          hint: 'Tente dizer: "Wǒ shuākǎ" (我刷卡)'
        }
      ]
    },

    confirmar_queijo: {
      id: 'confirmar_queijo',
      npcText: 'Perfeito! Um pão de queijo. São 6 yuan. Vai pagar em dinheiro ou cartão?',
      npcTextZh: '好的！一个奶酪面包。六元。您要付现金还是刷卡？',
      npcPinyin: 'Hǎo de! Yí gè nǎilào miànbāo. Liù yuán. Nín yào fù xiànjīn háishì shuākǎ?',
      intents: [
        {
          id: 'PAGAR_DINHEIRO',
          keywordsZh: ['现金','钱','付','给'],
          keywordsPinyin: ['xianjin','qian','fu','gei'],
          expectedResponses: ['我付现金','我给现金','现金'],
          nextNode: 'pagamento_ok',
          hint: 'Tente dizer: "Wǒ fù xiànjīn" (我付现金)'
        },
        {
          id: 'PAGAR_CARTAO',
          keywordsZh: ['刷卡','卡','付'],
          keywordsPinyin: ['shuaka','ka','fu'],
          expectedResponses: ['我刷卡','刷卡','我刷卡付'],
          nextNode: 'pagamento_ok',
          hint: 'Tente dizer: "Wǒ shuākǎ" (我刷卡)'
        }
      ]
    },

    pagamento_ok: {
      id: 'pagamento_ok',
      npcText: 'Obrigado! Aqui está o seu pão. Volte sempre!',
      npcTextZh: '谢谢！这是您的面包。欢迎下次再来！',
      npcPinyin: 'Xièxie! Zhè shì nín de miànbāo. Huānyíng xià cì zài lái!',
      intents: [
        {
          id: 'AGRADECER',
          keywordsZh: ['谢谢','感谢','再见'],
          keywordsPinyin: ['xiexie','ganxie','zaijian'],
          expectedResponses: ['谢谢','谢谢你','再见','谢谢再见'],
          nextNode: 'end',
          hint: 'Tente dizer: "Xièxie!" (谢谢!)'
        }
      ]
    },

    end: {
      id: 'end',
      npcText: 'Diálogo completo! Parabéns por praticar seu chinês na padaria.',
      npcTextZh: '对话完成！恭喜您在面包店练习了中文。',
      npcPinyin: 'Duìhuà wánchéng! Gōngxǐ nín zài miànbāo diàn liànxí le Zhōngwén.',
      isEnd: true,
      intents: []
    }
  }
};

export default padariaScenario;
