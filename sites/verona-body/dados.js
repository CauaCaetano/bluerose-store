// Vérona Body Clinic · dados de exemplo usados pelos assistentes (agendar e jornada). Troque aqui nomes, tratamentos e equipe.
window.VERONA = {
 "marca": "Vérona Body Clinic",
 "wa": "(62) 90000-0000",
 "endereco": "Rua de Exemplo, 100, sala 4 · Setor Marista · Goiânia (GO)",
 "objetivos": [
  {
   "id": "contorno",
   "nome": "Gordura localizada",
   "proto": "Vérona Contour",
   "txt": "Para quem tem uma área definida de gordura, como abdômen ou flancos, e quer trabalhar o contorno com tecnologia e acompanhamento.",
   "tecs": [
    "crio",
    "us",
    "press"
   ]
  },
  {
   "id": "firmeza",
   "nome": "Flacidez",
   "proto": "Vérona Firm",
   "txt": "Para pele com flacidez leve a moderada em abdômen, braços, coxas ou glúteos, com estímulo de colágeno e tônus.",
   "tecs": [
    "rf",
    "ems"
   ]
  },
  {
   "id": "inchaco",
   "nome": "Inchaço e retenção",
   "proto": "Vérona Balance",
   "txt": "Para pernas pesadas, inchaço no fim do dia e retenção de líquido, com compressão, drenagem e orientação de rotina.",
   "tecs": [
    "press",
    "lbp"
   ]
  },
  {
   "id": "posop",
   "nome": "Pós-operatório",
   "proto": "Vérona Recovery",
   "txt": "Para depois de lipoaspiração, abdominoplastia e outras cirurgias plásticas, sempre com a liberação e a orientação do seu cirurgião.",
   "tecs": [
    "lbp",
    "rf"
   ]
  }
 ],
 "tratamentos": [
  {
   "id": "criolipolise",
   "nome": "Criolipólise",
   "obj": [
    "contorno"
   ],
   "dur": "cerca de 60 min por área"
  },
  {
   "id": "ultrassom-cavitacional",
   "nome": "Ultrassom de cavitação",
   "obj": [
    "contorno"
   ],
   "dur": "cerca de 50 min com a drenagem"
  },
  {
   "id": "radiofrequencia-corporal",
   "nome": "Radiofrequência corporal",
   "obj": [
    "firmeza"
   ],
   "dur": "cerca de 40 min"
  },
  {
   "id": "eletroestimulacao",
   "nome": "Eletroestimulação",
   "obj": [
    "firmeza"
   ],
   "dur": "cerca de 30 min"
  },
  {
   "id": "drenagem-linfatica",
   "nome": "Drenagem linfática manual",
   "obj": [
    "inchaco",
    "posop"
   ],
   "dur": "cerca de 50 min"
  },
  {
   "id": "pressoterapia",
   "nome": "Pressoterapia",
   "obj": [
    "inchaco"
   ],
   "dur": "cerca de 40 min"
  },
  {
   "id": "pos-operatorio",
   "nome": "Acompanhamento pós-operatório",
   "obj": [
    "posop"
   ],
   "dur": "50 a 60 min"
  },
  {
   "id": "fotobiomodulacao",
   "nome": "Laser de baixa potência",
   "obj": [
    "posop",
    "inchaco"
   ],
   "dur": "cerca de 20 min (geralmente junto com drenagem)"
  }
 ],
 "tecnologias": [
  {
   "id": "rf",
   "nome": "Radiofrequência",
   "fin": "Flacidez leve a moderada e textura da pele do corpo."
  },
  {
   "id": "us",
   "nome": "Ultrassom de cavitação",
   "fin": "Gordura localizada, geralmente em conjunto com drenagem."
  },
  {
   "id": "crio",
   "nome": "Criolipólise",
   "fin": "Gordura localizada em áreas bem definidas."
  },
  {
   "id": "ems",
   "nome": "Eletroestimulação",
   "fin": "Tônus muscular, como complemento à atividade física."
  },
  {
   "id": "press",
   "nome": "Pressoterapia",
   "fin": "Inchaço e sensação de pernas pesadas."
  },
  {
   "id": "lbp",
   "nome": "Laser de baixa potência",
   "fin": "Apoio na recuperação, no pós-operatório e em áreas sensíveis."
  },
  {
   "id": "manual",
   "nome": "Drenagem linfática manual",
   "fin": "Técnica manual, sem aparelho, para inchaço e pós-operatório."
  }
 ],
 "equipe": [
  {
   "id": "helena",
   "nome": "Dra. Helena Vasconcelos",
   "cargo": "Médica · responsável técnica"
  },
  {
   "id": "rita",
   "nome": "Rita Albuquerque",
   "cargo": "Biomédica esteta"
  },
  {
   "id": "rafael",
   "nome": "Rafael Nogueira",
   "cargo": "Fisioterapeuta dermatofuncional"
  },
  {
   "id": "camila",
   "nome": "Camila Duarte",
   "cargo": "Esteticista e cosmetóloga"
  }
 ],
 "abordagens": {
  "contorno": [
   "Abdômen",
   "Flancos (laterais da cintura)",
   "Culote",
   "Parte interna da coxa",
   "Braços",
   "Costas (linha do sutiã)"
  ],
  "firmeza": [
   "Abdômen",
   "Braços",
   "Parte interna da coxa",
   "Glúteos",
   "Pós-gestação (com liberação médica)"
  ],
  "inchaco": [
   "Pernas e tornozelos",
   "Abdômen",
   "Inchaço no fim do dia",
   "Retenção no período menstrual"
  ],
  "posop": [
   "Lipoaspiração",
   "Abdominoplastia",
   "Cirurgia de mama",
   "Outra cirurgia plástica"
  ]
 }
};
