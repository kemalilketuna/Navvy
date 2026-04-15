// English translations (base/reference language)
const enUS = {
	ui: {
		panel: {
			ready: 'Ready',
			thinking: 'Thinking...',
			taskInput: 'Enter new task, describe steps in detail, press Enter to submit',
			userAnswerPrompt: 'Please answer the question above, press Enter to submit',
			taskTerminated: 'Task terminated',
			taskCompleted: 'Task completed',
			userAnswer: 'User answer: {{input}}',
			question: 'Question: {{question}}',
			waitingPlaceholder: 'Waiting for task to start...',
			stop: 'Stop',
			close: 'Close',
			expand: 'Expand history',
			collapse: 'Collapse history',
			step: 'Step {{number}}',
		},
		tools: {
			clicking: 'Clicking element [{{index}}]...',
			inputting: 'Inputting text to element [{{index}}]...',
			selecting: 'Selecting option "{{text}}"...',
			scrolling: 'Scrolling page...',
			waiting: 'Waiting {{seconds}} seconds...',
			askingUser: 'Asking user...',
			done: 'Task done',
			clicked: '🖱️ Clicked element [{{index}}]',
			inputted: '⌨️ Inputted text "{{text}}"',
			selected: '☑️ Selected option "{{text}}"',
			scrolled: '🛞 Page scrolled',
			waited: '⌛️ Wait completed',
			executing: 'Executing {{toolName}}...',
			resultSuccess: 'success',
			resultFailure: 'failed',
			resultError: 'error',
		},
		errors: {
			elementNotFound: 'No interactive element found at index {{index}}',
			taskRequired: 'Task description is required',
			executionFailed: 'Task execution failed',
			notInputElement: 'Element is not an input or textarea',
			notSelectElement: 'Element is not a select element',
			optionNotFound: 'Option "{{text}}" not found',
		},
	},
} as const

// French translations (must match the structure of enUS)
const frFR = {
	ui: {
		panel: {
			ready: 'Prêt',
			thinking: 'Réflexion...',
			taskInput:
				'Saisissez une nouvelle tâche, décrivez les étapes en détail, puis appuyez sur Entrée',
			userAnswerPrompt: 'Répondez à la question ci-dessus, puis appuyez sur Entrée',
			taskTerminated: 'Tâche interrompue',
			taskCompleted: 'Tâche terminée',
			userAnswer: 'Réponse utilisateur : {{input}}',
			question: 'Question : {{question}}',
			waitingPlaceholder: 'En attente du démarrage de la tâche...',
			stop: 'Arrêter',
			close: 'Fermer',
			expand: "Développer l'historique",
			collapse: "Réduire l'historique",
			step: 'Étape {{number}}',
		},
		tools: {
			clicking: "Clic sur l'élément [{{index}}]...",
			inputting: "Saisie de texte dans l'élément [{{index}}]...",
			selecting: 'Sélection de l’option "{{text}}"...',
			scrolling: 'Défilement de la page...',
			waiting: 'Attente de {{seconds}} secondes...',
			askingUser: "Question à l'utilisateur...",
			done: 'Tâche terminée',
			clicked: '🖱️ Élément [{{index}}] cliqué',
			inputted: '⌨️ Texte "{{text}}" saisi',
			selected: '☑️ Option "{{text}}" sélectionnée',
			scrolled: '🛞 Page défilée',
			waited: '⌛️ Attente terminée',
			executing: 'Exécution de {{toolName}}...',
			resultSuccess: 'réussite',
			resultFailure: 'échec',
			resultError: 'erreur',
		},
		errors: {
			elementNotFound: 'Aucun élément interactif trouvé à l’index {{index}}',
			taskRequired: 'La description de la tâche est obligatoire',
			executionFailed: "L'exécution de la tâche a échoué",
			notInputElement: "L'élément n'est pas un champ de saisie ni une zone de texte",
			notSelectElement: "L'élément n'est pas un élément select",
			optionNotFound: 'Option "{{text}}" introuvable',
		},
	},
} as const

// German translations (must match the structure of enUS)
const deDE = {
	ui: {
		panel: {
			ready: 'Bereit',
			thinking: 'Denkt nach...',
			taskInput: 'Neue Aufgabe eingeben, Schritte ausführlich beschreiben, mit Enter absenden',
			userAnswerPrompt: 'Bitte beantworten Sie die obige Frage und drücken Sie Enter',
			taskTerminated: 'Aufgabe abgebrochen',
			taskCompleted: 'Aufgabe abgeschlossen',
			userAnswer: 'Antwort des Benutzers: {{input}}',
			question: 'Frage: {{question}}',
			waitingPlaceholder: 'Warten auf den Start der Aufgabe...',
			stop: 'Stopp',
			close: 'Schließen',
			expand: 'Verlauf erweitern',
			collapse: 'Verlauf einklappen',
			step: 'Schritt {{number}}',
		},
		tools: {
			clicking: 'Klicke auf Element [{{index}}]...',
			inputting: 'Gebe Text in Element [{{index}}] ein...',
			selecting: 'Wähle Option "{{text}}"...',
			scrolling: 'Scrolle die Seite...',
			waiting: 'Warte {{seconds}} Sekunden...',
			askingUser: 'Frage Benutzer...',
			done: 'Aufgabe erledigt',
			clicked: '🖱️ Element [{{index}}] angeklickt',
			inputted: '⌨️ Text "{{text}}" eingegeben',
			selected: '☑️ Option "{{text}}" ausgewählt',
			scrolled: '🛞 Seite gescrollt',
			waited: '⌛️ Warten abgeschlossen',
			executing: '{{toolName}} wird ausgeführt...',
			resultSuccess: 'erfolgreich',
			resultFailure: 'fehlgeschlagen',
			resultError: 'Fehler',
		},
		errors: {
			elementNotFound: 'Kein interaktives Element mit Index {{index}} gefunden',
			taskRequired: 'Aufgabenbeschreibung ist erforderlich',
			executionFailed: 'Aufgabenausführung fehlgeschlagen',
			notInputElement: 'Element ist kein Eingabefeld oder Textbereich',
			notSelectElement: 'Element ist kein Select-Element',
			optionNotFound: 'Option "{{text}}" nicht gefunden',
		},
	},
} as const

// Spanish translations (must match the structure of enUS)
const esES = {
	ui: {
		panel: {
			ready: 'Listo',
			thinking: 'Pensando...',
			taskInput:
				'Introduce una nueva tarea, describe los pasos en detalle y pulsa Enter para enviar',
			userAnswerPrompt: 'Responde a la pregunta anterior y pulsa Enter para enviar',
			taskTerminated: 'Tarea interrumpida',
			taskCompleted: 'Tarea completada',
			userAnswer: 'Respuesta del usuario: {{input}}',
			question: 'Pregunta: {{question}}',
			waitingPlaceholder: 'Esperando a que comience la tarea...',
			stop: 'Detener',
			close: 'Cerrar',
			expand: 'Expandir historial',
			collapse: 'Contraer historial',
			step: 'Paso {{number}}',
		},
		tools: {
			clicking: 'Haciendo clic en el elemento [{{index}}]...',
			inputting: 'Introduciendo texto en el elemento [{{index}}]...',
			selecting: 'Seleccionando la opción "{{text}}"...',
			scrolling: 'Desplazando la página...',
			waiting: 'Esperando {{seconds}} segundos...',
			askingUser: 'Preguntando al usuario...',
			done: 'Tarea terminada',
			clicked: '🖱️ Elemento [{{index}}] pulsado',
			inputted: '⌨️ Texto "{{text}}" introducido',
			selected: '☑️ Opción "{{text}}" seleccionada',
			scrolled: '🛞 Página desplazada',
			waited: '⌛️ Espera completada',
			executing: 'Ejecutando {{toolName}}...',
			resultSuccess: 'correcto',
			resultFailure: 'fallido',
			resultError: 'error',
		},
		errors: {
			elementNotFound: 'No se encontró ningún elemento interactivo en el índice {{index}}',
			taskRequired: 'La descripción de la tarea es obligatoria',
			executionFailed: 'La ejecución de la tarea falló',
			notInputElement: 'El elemento no es un input ni un textarea',
			notSelectElement: 'El elemento no es un elemento select',
			optionNotFound: 'No se encontró la opción "{{text}}"',
		},
	},
} as const

// Italian translations (must match the structure of enUS)
const itIT = {
	ui: {
		panel: {
			ready: 'Pronto',
			thinking: 'Sto pensando...',
			taskInput: 'Inserisci una nuova attività, descrivi i passaggi in dettaglio e premi Invio',
			userAnswerPrompt: 'Rispondi alla domanda sopra e premi Invio',
			taskTerminated: 'Attività interrotta',
			taskCompleted: 'Attività completata',
			userAnswer: 'Risposta utente: {{input}}',
			question: 'Domanda: {{question}}',
			waitingPlaceholder: "In attesa dell'avvio dell'attività...",
			stop: 'Interrompi',
			close: 'Chiudi',
			expand: 'Espandi cronologia',
			collapse: 'Comprimi cronologia',
			step: 'Passaggio {{number}}',
		},
		tools: {
			clicking: "Clic sull'elemento [{{index}}]...",
			inputting: "Inserimento testo nell'elemento [{{index}}]...",
			selecting: 'Selezione dell’opzione "{{text}}"...',
			scrolling: 'Scorrimento della pagina...',
			waiting: 'Attesa di {{seconds}} secondi...',
			askingUser: "Domanda all'utente...",
			done: 'Attività completata',
			clicked: '🖱️ Elemento [{{index}}] cliccato',
			inputted: '⌨️ Testo "{{text}}" inserito',
			selected: '☑️ Opzione "{{text}}" selezionata',
			scrolled: '🛞 Pagina scorsa',
			waited: '⌛️ Attesa completata',
			executing: 'Esecuzione di {{toolName}}...',
			resultSuccess: 'riuscito',
			resultFailure: 'non riuscito',
			resultError: 'errore',
		},
		errors: {
			elementNotFound: 'Nessun elemento interattivo trovato all’indice {{index}}',
			taskRequired: "La descrizione dell'attività è obbligatoria",
			executionFailed: "Esecuzione dell'attività non riuscita",
			notInputElement: "L'elemento non è un input né una textarea",
			notSelectElement: "L'elemento non è un elemento select",
			optionNotFound: 'Opzione "{{text}}" non trovata',
		},
	},
} as const

// Portuguese translations (must match the structure of enUS)
const ptPT = {
	ui: {
		panel: {
			ready: 'Pronto',
			thinking: 'A pensar...',
			taskInput:
				'Introduza uma nova tarefa, descreva os passos em detalhe e prima Enter para enviar',
			userAnswerPrompt: 'Responda à pergunta acima e prima Enter para enviar',
			taskTerminated: 'Tarefa interrompida',
			taskCompleted: 'Tarefa concluída',
			userAnswer: 'Resposta do utilizador: {{input}}',
			question: 'Pergunta: {{question}}',
			waitingPlaceholder: 'À espera que a tarefa comece...',
			stop: 'Parar',
			close: 'Fechar',
			expand: 'Expandir histórico',
			collapse: 'Recolher histórico',
			step: 'Passo {{number}}',
		},
		tools: {
			clicking: 'A clicar no elemento [{{index}}]...',
			inputting: 'A introduzir texto no elemento [{{index}}]...',
			selecting: 'A selecionar a opção "{{text}}"...',
			scrolling: 'A deslocar a página...',
			waiting: 'A aguardar {{seconds}} segundos...',
			askingUser: 'A perguntar ao utilizador...',
			done: 'Tarefa concluída',
			clicked: '🖱️ Elemento [{{index}}] clicado',
			inputted: '⌨️ Texto "{{text}}" introduzido',
			selected: '☑️ Opção "{{text}}" selecionada',
			scrolled: '🛞 Página deslocada',
			waited: '⌛️ Espera concluída',
			executing: 'A executar {{toolName}}...',
			resultSuccess: 'sucesso',
			resultFailure: 'falha',
			resultError: 'erro',
		},
		errors: {
			elementNotFound: 'Nenhum elemento interativo encontrado no índice {{index}}',
			taskRequired: 'A descrição da tarefa é obrigatória',
			executionFailed: 'A execução da tarefa falhou',
			notInputElement: 'O elemento não é um input nem uma textarea',
			notSelectElement: 'O elemento não é um elemento select',
			optionNotFound: 'Opção "{{text}}" não encontrada',
		},
	},
} as const

// Turkish translations (must match the structure of enUS)
const trTR = {
	ui: {
		panel: {
			ready: 'Hazır',
			thinking: 'Düşünüyor...',
			taskInput: 'Yeni görevi girin, adımları ayrıntılı açıklayın, göndermek için Enter’a basın',
			userAnswerPrompt: 'Lütfen yukarıdaki soruyu yanıtlayın, göndermek için Enter’a basın',
			taskTerminated: 'Görev sonlandırıldı',
			taskCompleted: 'Görev tamamlandı',
			userAnswer: 'Kullanıcı yanıtı: {{input}}',
			question: 'Soru: {{question}}',
			waitingPlaceholder: 'Görevin başlaması bekleniyor...',
			stop: 'Durdur',
			close: 'Kapat',
			expand: 'Geçmişi genişlet',
			collapse: 'Geçmişi daralt',
			step: 'Adım {{number}}',
		},
		tools: {
			clicking: '[{{index}}] öğesine tıklanıyor...',
			inputting: '[{{index}}] öğesine metin giriliyor...',
			selecting: '"{{text}}" seçeneği seçiliyor...',
			scrolling: 'Sayfa kaydırılıyor...',
			waiting: '{{seconds}} saniye bekleniyor...',
			askingUser: 'Kullanıcıya soruluyor...',
			done: 'Görev bitti',
			clicked: '🖱️ [{{index}}] öğesine tıklandı',
			inputted: '⌨️ "{{text}}" metni girildi',
			selected: '☑️ "{{text}}" seçeneği seçildi',
			scrolled: '🛞 Sayfa kaydırıldı',
			waited: '⌛️ Bekleme tamamlandı',
			executing: '{{toolName}} çalıştırılıyor...',
			resultSuccess: 'başarılı',
			resultFailure: 'başarısız',
			resultError: 'hata',
		},
		errors: {
			elementNotFound: '{{index}} indeksinde etkileşimli öğe bulunamadı',
			taskRequired: 'Görev açıklaması gerekli',
			executionFailed: 'Görev yürütme başarısız oldu',
			notInputElement: 'Öğe input veya textarea değil',
			notSelectElement: 'Öğe select elementi değil',
			optionNotFound: '"{{text}}" seçeneği bulunamadı',
		},
	},
} as const

// Type definitions generated from English base structure (but with string values)
type DeepStringify<T> = {
	[K in keyof T]: T[K] extends string ? string : T[K] extends object ? DeepStringify<T[K]> : T[K]
}

export type TranslationSchema = DeepStringify<typeof enUS>

// Utility type: Extract all nested paths from translation object
type NestedKeyOf<ObjectType extends object> = {
	[Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
		? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
		: `${Key}`
}[keyof ObjectType & (string | number)]

// Extract all possible key paths from translation structure
export type TranslationKey = NestedKeyOf<TranslationSchema>

// Parameterized translation types
export type TranslationParams = Record<string, string | number>

export const locales = {
	'en-US': enUS,
	'fr-FR': frFR,
	'de-DE': deDE,
	'es-ES': esES,
	'it-IT': itIT,
	'pt-PT': ptPT,
	'tr-TR': trTR,
} as const

export type SupportedLanguage = keyof typeof locales
