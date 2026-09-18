# Conviction: encaje propuesto de TypeSafe

Fecha: 2026-09-18. Estado: investigación y recomendación; no es una especificación aprobada ni una integración probada.

## Decisión recomendada

Usar TypeSafe para un juicio semántico acotado: determinar cómo se relaciona un pasaje concreto con una hipótesis de la startup. La aplicación conserva las fuentes, combina los resultados sin ocultar contradicciones y propone una pregunta de seguimiento mediante reglas y un catálogo pequeño.

Esto permite demostrar el núcleo de Conviction con inferencia real, sin necesitar un segundo modelo generador. El caso preparado, las tres hipótesis y el catálogo siguen siendo propuestas: no reemplazan las preguntas de producto pendientes en README.md.

## Dónde entra

1. **Relación entre hipótesis y evidencia — núcleo del MVP.** Para cada par de hipótesis y pasaje, devolver una opción tipada: respalda, contradice, contiene señales mixtas o no permite concluir. Las definiciones y ejemplos de esas opciones deben calibrarse con el caso elegido. El juicio describe lo que la fuente afirma, no certifica la realidad del negocio.
2. **Selección de pasajes — opcional.** Con documentos pequeños, segmentar en código y evaluar los pasajes puede ser suficiente. Si hace falta buscar los más relevantes, usar identificadores de pasajes existentes y contemplar explícitamente que ninguno sea relevante. No permitir citas inventadas.
3. **Siguiente pregunta — reglas primero.** Vincular cada hipótesis y vacío de evidencia con preguntas redactadas previamente. Por ejemplo, ante intención de compra sin pagos reportados, preguntar por clientes que ya pagaron y su evidencia. Un ranking semántico entre preguntas puede agregarse si las reglas resultan insuficientes; generar preguntas nuevas exige otra capacidad y amplía el alcance.

## Ejemplo de comportamiento

Hipótesis: «Hay clientes que ya pagan por el producto». Fuente ficticia: «Tres empresas están haciendo pilotos gratuitos y dos dijeron que pagarían».

El pasaje no establece que existan pagos actuales. La interfaz muestra la frase original y mantiene ese punto pendiente. Próxima pregunta propuesta: «¿Hay algún cliente que ya haya pagado? ¿Qué comprobante tenemos?».

Al agregar una nota que informa un pago, la evaluación puede cambiar a apoyo en esa fuente. Debe seguir siendo visible que se trata de un pago reportado por la nota. Una nota nueva no elimina automáticamente una fuente anterior contradictoria.

## Flujo mínimo

Documento o nota → pasajes con identificadores → TypeSafe evalúa relaciones → código agrupa por hipótesis → interfaz muestra fuentes, desacuerdos y pregunta siguiente.

Una app TypeScript puede llamar al SDK oficial desde el servidor. La clave permanece en el servidor. El código del proveedor queda detrás de una interfaz pequeña; las reglas del producto quedan fuera de los componentes visuales.

Los juicios independientes pueden enviarse en una misma solicitud. Un juicio que depende de otro necesita un paso posterior. Para el corpus pequeño propuesto no hay una necesidad demostrada de agentes, base vectorial ni orquestación adicional. No se han medido costo ni latencia.

## Qué queda en código

- Identificadores, referencias y verificación de que una cita pertenece a la fuente.
- Comparaciones exactas de montos, fechas, cantidades y vencimientos.
- Conservación de resultados por fuente y agregación que preserve desacuerdos.
- Selección inicial de preguntas mediante reglas explícitas.
- Manejo de errores y estados pendientes; un fallo del servicio no significa ausencia de evidencia.

Evitar un puntaje global de «convicción 87/100»: todavía no hay una definición de negocio ni calibración que lo justifique.

## Hallazgos de la documentación

- El [cookbook de verificación de citas](https://docs.typesafe.ai/cookbooks/citation_check.md) combina comprobación textual en código con una clasificación semántica de apoyo, contradicción o ausencia de información. Es el ejemplo más cercano. Su etiqueta de verificación no debe trasladarse a una afirmación de verdad empresarial; sus resultados sintéticos no prueban precisión para análisis de startups.
- [Semantic find](https://docs.typesafe.ai/cookbooks/semantic_find.md) selecciona referencias existentes. Choice siempre elige una opción: hacen falta una salida «ninguna» o un juicio separado de presencia cuando corresponda.
- [Confidence](https://docs.typesafe.ai/confidence.md) describe concentración de la distribución, no probabilidad de acierto ni probabilidad de éxito de la startup. No copiar un umbral como 0,8 sin evaluación. Distinguir «no hay evidencia suficiente» de «el modelo está indeciso».
- Las [limitaciones de Jev 1.13](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md) incluyen literalidad, problemas con aritmética y fechas, degradación por contexto irrelevante e influencia de instrucciones adversarias en el texto. Una salida tipada no garantiza resistencia a inyección de instrucciones. Jev no genera texto libre.
- El [SDK JavaScript/TypeScript](https://docs.typesafe.ai/sdk/javascript.md) permite integrar directamente con Node 20+ mediante `@typesafe-ai/sdk`; no hace falta un servicio Python adicional.
- La [guía de construcción](https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md) recomienda código para el flujo y juicios estrechos con estado relevante. En [Choice](https://docs.typesafe.ai/primitives/choice.md), los identificadores de pregunta no sustituyen instrucciones explícitas: hay que indicar qué datos evaluar.

## Prueba propuesta antes de construir la interfaz

Preparar un caso ficticio con resultados esperados revisables y probar 12 situaciones:

1. Apoyo explícito en una fuente.
2. Contradicción explícita.
3. Pasaje irrelevante.
4. Señales mixtas en un mismo pasaje.
5. Fuentes que se contradicen entre sí.
6. Intención futura confundible con un hecho actual.
7. Afirmación atribuida al fundador, sin comprobación independiente.
8. Evidencia antigua frente a una actualización con fecha explícita.
9. Monto o cantidad que requiere una comparación exacta en código.
10. Cita inexistente o identificador inválido.
11. Texto fuente que intenta dar instrucciones al modelo.
12. Error o timeout del proveedor.

Registrar resultados, referencias conservadas, errores por clase, cambios al agregar la nota y tiempo de respuesta. Comparar con las etiquetas esperadas; corregir criterios antes de introducir umbrales de confianza. Son pruebas planificadas: ninguna fue ejecutada en esta investigación.

## Estado y siguiente paso

La documentación y los cookbooks sustentan este encaje técnico. Matias confirmó acceso a TypeSafe; la configuración de la clave y una llamada real siguen sin verificarse. No se instaló el SDK ni se escribió código de aplicación en esta etapa.

Siguiente paso recomendado: resolver el formato de demo y las entradas pendientes, fijar un caso pequeño con etiquetas esperadas y ejecutar el prototipo de relaciones. El resultado permitirá decidir si la semántica propuesta es suficientemente útil antes de construir la interfaz.
