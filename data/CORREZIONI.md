# Correzioni al foglio dei verbi

File corretto: `Italian_Verb_Chart_CORRETTO.xlsx` (stessa struttura dell'originale). Ogni cella modificata è **evidenziata in giallo** e ha un commento con il valore precedente e il motivo. Il foglio **Correzioni** elenca tutte le modifiche e si può filtrare.

**Totale: 1365 celle corrette in 291 verbi** su 2.280. Dopo le correzioni il controllo automatico non trova più incoerenze e non ci sono celle vuote.

## Come è stato controllato

1. Per i verbi regolari ogni forma è stata confrontata con la coniugazione generata dalle regole (incluse -care/-gare, -ciare/-giare, -iare, verbi in -isc-, riflessivi con enclitici).
2. Per gli irregolari si usano regole di coerenza interna valide anche per loro: congiuntivo imperfetto dal passato remoto (tu), condizionale dal tema del futuro, imperfetto dal gerundio, passato remoto forte (io → lui/loro), congiuntivo presente dal presente (io/noi), imperativo da presente e congiuntivo.
3. I casi dubbi e i verbi più irregolari (essere, avere, fare, dire, porre, -durre, -gliere, piacere…) sono stati rivisti a mano, insieme agli ausiliari.

Gli script sono in `tools/verb-audit/` e si possono rieseguire.

## Verbi con il tema scritto male in tutta la riga (rigenerati) (718 celle)

| Verbo | Campo | Prima | Dopo |
|---|---|---|---|
| automatizzare | Presente – io | automizzo | **automatizzo** |
| automatizzare | Presente – tu | automizzi | **automatizzi** |
| automatizzare | Presente – lui/lei | automizza | **automatizza** |
| automatizzare | Presente – noi | automizziamo | **automatizziamo** |
| automatizzare | Presente – voi | automizzate | **automatizzate** |
| automatizzare | Presente – loro | automizzano | **automatizzano** |
| automatizzare | Imperfetto – io | automizzavo | **automatizzavo** |
| automatizzare | Imperfetto – tu | automizzavi | **automatizzavi** |
| automatizzare | Imperfetto – lui/lei | automizzava | **automatizzava** |
| biasimare | Presente – io | biasamo | **biasimo** |
| inizializzare | Presente – io | inizailizzo | **inizializzo** |
| preoccupare | Presente – io | preoccuparo | **preoccupo** |
| riutilizzare | Presente – io | riutillizo | **riutilizzo** |
| sbriciolare | Presente – io | sbricolo | **sbriciolo** |

## Classe di coniugazione / flag sbagliati (19 celle)

| Verbo | Campo | Prima | Dopo |
|---|---|---|---|
| avvilire | conj. | ire 1 | **ire 2** |
| insaporire | conj. | ire 1 | **ire 2** |
| inserire | conj. | ire 1 | **ire 2** |
| insospettire | conj. | ire 1 | **ire 2** |
| interagire | conj. | ire 1 | **ire 2** |
| interferire | conj. | ire 1 | **ire 2** |
| intimidire | conj. | ire 1 | **ire 2** |
| intorpidire | conj. | ire 1 | **ire 2** |
| stabilire | conj. | ire 1 | **ire 2** |
| trasferire | conj. | ire 1 | **ire 2** |
| morire | conj. | ire 1 | **ire 1 irr** |
| riempire | conj. | ire 1 | **ire 1 irr** |
| risalire | conj. | ire 1 | **ire 1 irr** |
| riuscire | conj. | ire 1 | **ire 1 irr** |

## Ausiliare sbagliato (49 celle)

| Verbo | Campo | Prima | Dopo |
|---|---|---|---|
| arrampicarsi | Ausiliario | avere | **essere** |
| arrendersi | Ausiliario | avere | **essere** |
| avercela | Ausiliario | essere | **avere** |
| farcela | Ausiliario | essere | **avere** |
| sottostare | Ausiliario | avere | **essere** |
| fuoriuscire | Ausiliario | avere | **essere** |
| convivere | Ausiliario | essere | **avere** |
| compiacere | Ausiliario | essere | **avere** |
| possedere | Ausiliario | avere/essere | **avere** |
| rincorrere | Ausiliario | avere/essere | **avere** |
| tralasciare | Ausiliario | avere/essere | **avere** |
| gioire | Ausiliario | avere/essere | **avere** |
| rifinire | Ausiliario | avere/essere | **avere** |
| ripulire | Ausiliario | avere/essere | **avere** |

## Accenti e caratteri (53 celle)

| Verbo | Campo | Prima | Dopo |
|---|---|---|---|
| abbattere | Passato remoto – lui/lei | abbattè | **abbatté** |
| assistere | Passato remoto – lui/lei | assistè | **assisté** |
| battere | Passato remoto – lui/lei | battè | **batté** |
| coesistere | Passato remoto – lui/lei | coesistè | **coesisté** |
| combattere | Passato remoto – lui/lei | combattè | **combatté** |
| connettere | Passato remoto – lui/lei | connettè | **connetté** |
| consistere | Passato remoto – lui/lei | consistè | **consisté** |
| desistere | Passato remoto – lui/lei | desistè | **desisté** |
| dibattere | Passato remoto – lui/lei | dibattè | **dibatté** |
| disconnettere | Passato remoto – lui/lei | disconnettè | **disconnetté** |
| esigere | Passato remoto – lui/lei | esigè | **esigé** |
| esistere | Passato remoto – lui/lei | esistè | **esisté** |
| godere | Passato remoto – lui/lei | godè | **godé** |
| imbattersi | Passato remoto – lui/lei | si imbattè | **si imbatté** |

## Verbi irregolari corretti a mano (132 celle)

| Verbo | Campo | Prima | Dopo |
|---|---|---|---|
| andare | Congiuntivo presente – loro | vadono | **vadano** |
| andarsene | Presente – tu | ti ne vai | **te ne vai** |
| andarsene | Imperativo – lui/lei | si vada | **se ne vada** |
| andarsene | Imperativo – voi | andatavene | **andatevene** |
| andarsene | Imperativo – loro | si vadano | **se ne vadano** |
| andarsene | Condizionale – loro | se ne andrebero | **se ne andrebbero** |
| avercela | Futuro – io | ce l'avro | **ce l'avrò** |
| avercela | Futuro – tu | ce l'avra | **ce l'avrai** |
| avercela | Futuro – lui/lei | ce l'avra | **ce l'avrà** |
| farcela | Presente – noi | ce le facciamo | **ce la facciamo** |
| essere | Imperativo – voi | siete | **siate** |
| sapere | Imperativo – voi | sapete | **sappiate** |
| volere | Imperativo – voi | volete | **vogliate** |
| dire | Congiuntivo imperfetto – io | dessi | **dicessi** |

## Refusi e incoerenze trovati con le regole di coniugazione (394 celle)

| Verbo | Campo | Prima | Dopo |
|---|---|---|---|
| abbaiare | Passato remoto – tu | None | **abbaiasti** |
| abbaiare | Passato remoto – lui/lei | None | **abbaiò** |
| abbaiare | Passato remoto – noi | None | **abbaiammo** |
| abbaiare | Passato remoto – voi | None | **abbaiaste** |
| abbandonare | Passato remoto – tu | None | **abbandonasti** |
| abbandonare | Passato remoto – lui/lei | None | **abbandonò** |
| abbandonare | Passato remoto – noi | None | **abbandonammo** |
| abbandonare | Passato remoto – voi | None | **abbandonaste** |
| abbandonarsi | Passato remoto – tu | None | **ti abbandonasti** |
| abbassare | Passato remoto – tu | None | **abbassasti** |
| abbracciare | Passato remoto – tu | abbraciasti | **abbracciasti** |
| accettare | Passato remoto – io | accetai | **accettai** |
| adottare | Passato remoto – loro | addotarono | **adottarono** |
| applaudire | Passato remoto – voi | applaudieste | **applaudiste** |

## Da sapere

- I segni come «(1)», «(2)» nella colonna *Significato* indicano sinonimi: li ho lasciati nel foglio, l'app li nasconde.
- Alcuni verbi hanno più forme accettate (es. *sedere*: siedo/seggo; *compiere*: compio/compisco; *nuocere*: nociamo/nuociamo). Ho tenuto la forma del foglio quando è corretta.
- Ausiliare «avere/essere» indica i verbi che usano l'uno o l'altro a seconda del significato (es. *correre*, *salire*, *aumentare*). L'app mostra entrambe le forme nei tempi composti.
- La colonna Arabo è stata controllata solo per celle vuote o caratteri latini (nessun problema trovato); le traduzioni non sono state riviste una per una.