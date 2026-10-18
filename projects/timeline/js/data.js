/* Datos de la línea de tiempo.
   Para añadir o editar hitos, toca solo este archivo.
   cats: hw = Hardware, sw = Software, net = Redes, ai = Inteligencia Artificial
   short (opcional): versión corta del año para el panel fijo. */
window.TIMELINE = {
	cats: {
		hw: 'Hardware',
		sw: 'Software',
		net: 'Redes',
		ai: 'Inteligencia Artificial'
	},

	hero: { bg: '#12141c', accent: '#e3b35c' },
	end: { bg: '#0d0a1f', accent: '#7ff0ff' },

	eras: [
		{
			title: 'Orígenes del pensamiento computacional',
			bg: '#26180e', accent: '#e3b35c',
			events: [
				{ year: 'Siglo IX', title: 'El origen de los algoritmos', cats: ['sw'], text: 'Al-Juarismi establece métodos matemáticos que darán origen al concepto de algoritmo, fundamental para programar ordenadores.' },
				{ year: '1833-1842', title: 'La máquina analítica', cats: ['hw'], text: 'Charles Babbage diseña una máquina mecánica programable, precursora conceptual de los ordenadores modernos.' },
				{ year: '1843', title: 'El primer algoritmo publicado para una máquina', cats: ['sw'], text: 'Ada Lovelace describe un procedimiento para calcular números de Bernoulli mediante la máquina analítica, considerado uno de los primeros programas informáticos.' },
				{ year: 'Siglo XIX', title: 'Nacen las redes de comunicación', cats: ['net'], text: 'El telégrafo y la telefonía permiten transmitir mensajes a distancia y sientan las bases de las redes de telecomunicaciones.' }
			]
		},
		{
			title: 'Las bases teóricas y electrónicas',
			bg: '#07292b', accent: '#ffb64d',
			events: [
				{ year: '1936', title: 'La máquina universal de Turing', cats: ['sw'], text: 'Alan Turing establece un modelo teórico de computación capaz de ejecutar diferentes procedimientos mediante instrucciones.' },
				{ year: '1944', title: 'Colossus', cats: ['hw'], text: 'Este ordenador electrónico programable se utiliza para descifrar códigos durante la Segunda Guerra Mundial.' },
				{ year: '1945-1946', title: 'ENIAC', cats: ['hw'], text: 'Uno de los primeros ordenadores electrónicos de propósito general demuestra el potencial del cálculo automático.' },
				{ year: '1947', title: 'Invención del transistor', cats: ['hw'], text: 'El transistor reduce el tamaño y el consumo energético de los componentes electrónicos, haciendo posible construir equipos cada vez más pequeños.' },
				{ year: '1948', title: 'Teoría matemática de la información', cats: ['sw', 'net'], text: 'Claude Shannon establece fundamentos para medir, codificar y transmitir información digital.' },
				{ year: '1951', title: 'UNIVAC I', cats: ['hw'], text: 'Uno de los primeros ordenadores comerciales de propósito general acerca la informática a las empresas y las instituciones.' }
			]
		},
		{
			title: 'La informática se vuelve programable y conectada',
			bg: '#1c2433', accent: '#ff7a59',
			events: [
				{ year: '1951', title: 'Primeros compiladores', cats: ['sw'], text: 'Grace Hopper desarrolla A-0, un sistema precursor de los compiladores que facilita la traducción de instrucciones a código ejecutable.' },
				{ year: '1957', title: 'FORTRAN', cats: ['sw'], text: 'Este lenguaje facilita la programación científica y demuestra que programar no tiene que hacerse exclusivamente en lenguaje máquina.' },
				{ year: '1958', title: 'Circuito integrado', cats: ['hw'], text: 'Jack Kilby desarrolla un circuito integrado funcional, un paso esencial hacia la miniaturización de los ordenadores.' },
				{ year: 'Décadas de 1950-1960', short: '1950-1960', title: 'Primeras conexiones entre ordenadores', cats: ['net'], text: 'Los sistemas informáticos empiezan a intercambiar datos y compartir recursos a distancia.' },
				{ year: '1961-1965', title: 'Conmutación de paquetes', cats: ['net'], text: 'Se desarrollan conceptos que permiten dividir los datos en paquetes y enviarlos por redes, una base técnica de Internet.' },
				{ year: '1964', title: 'Prototipo del ratón informático', cats: ['hw'], text: 'Douglas Engelbart y Bill English desarrollan un dispositivo que facilita la interacción entre las personas y los ordenadores.' },
				{ year: '1965', title: 'El concepto de hipertexto', cats: ['sw', 'net'], text: 'Ted Nelson acuña el término hipertexto para describir documentos conectados mediante enlaces, una idea precursora de la Web.' },
				{ year: '1965', title: 'La observación de Moore', cats: ['hw'], text: 'Gordon Moore observa el crecimiento del número de componentes en los chips, anticipando la rápida evolución de la capacidad de cálculo.' },
				{ year: '1969', title: 'Nace Unix', cats: ['sw'], text: 'Este sistema operativo influye profundamente en los sistemas informáticos posteriores, incluidos muchos sistemas actuales.' },
				{ year: '1969', title: 'Nace ARPANET', cats: ['net'], text: 'La red conecta sus primeros nodos universitarios y se convierte en uno de los principales antecedentes de Internet.' }
			]
		},
		{
			title: 'La expansión de los ordenadores personales e Internet',
			bg: '#3a1220', accent: '#ffc857',
			events: [
				{ year: '1971', title: 'Microprocesador Intel 4004', cats: ['hw'], text: 'Integra la unidad de procesamiento en un solo chip y abre nuevas posibilidades para los ordenadores compactos.' },
				{ year: '1971', title: 'Nace el correo electrónico en red', cats: ['net'], text: 'Ray Tomlinson desarrolla el correo electrónico entre equipos conectados y populariza el uso de la arroba (@) en las direcciones.' },
				{ year: '1972', title: 'Lenguaje C', cats: ['sw'], text: 'C facilita el desarrollo de sistemas operativos y programas eficientes, y se convierte en una influencia duradera en la programación.' },
				{ year: '1974', title: 'Bases de TCP', cats: ['net'], text: 'Vinton Cerf y Robert Kahn publican los fundamentos de un protocolo para comunicar redes diferentes, precursor de TCP/IP.' },
				{ year: '1975', title: 'Fundación de Microsoft', cats: ['sw'], text: 'La empresa impulsa el desarrollo y la comercialización de software para ordenadores personales.' },
				{ year: '1980', title: 'Desarrollo de C++', cats: ['sw'], text: 'El lenguaje amplía las posibilidades de C e impulsa la programación orientada a objetos.' },
				{ year: '1983', title: 'TCP/IP y expansión de Internet', cats: ['net'], text: 'ARPANET adopta TCP/IP, unificando la comunicación entre redes. El DNS comienza a desarrollarse para facilitar el uso de nombres de dominio.' },
				{ year: '1983', title: 'Proyecto GNU', cats: ['sw'], text: 'Richard Stallman inicia un proyecto para desarrollar un sistema operativo basado en software libre y promover la libertad de los usuarios.' },
				{ year: '1985', title: 'Windows 1.0', cats: ['sw'], text: 'Microsoft introduce un entorno gráfico que contribuye a acercar la informática personal a más usuarios.' }
			]
		},
		{
			title: 'La Web y la sociedad digital',
			bg: '#0a2a6e', accent: '#6fe8ff',
			events: [
				{ year: '1989-1991', title: 'Nace la World Wide Web', cats: ['net', 'sw'], text: 'Tim Berners-Lee desarrolla la Web, que permite consultar e interconectar documentos mediante páginas e hipervínculos.' },
				{ year: '1991', title: 'Linux y Python', cats: ['sw'], text: 'Linux comienza como un proyecto de núcleo de sistema operativo y Python surge como lenguaje de programación. Ambos alcanzarán una gran influencia en la informática.' },
				{ year: '1993', title: 'La Web se abre al público', cats: ['net'], text: 'El CERN libera la tecnología de la Web para su uso gratuito y el navegador Mosaic facilita la navegación gráfica.' },
				{ year: '1995', title: 'Popularización de la navegación web', cats: ['net', 'sw'], text: 'Internet Explorer, Netscape y otros navegadores ayudan a extender el uso de Internet en los hogares y las empresas.' },
				{ year: '1999', title: 'GeForce 256', cats: ['hw'], text: 'NVIDIA presenta una GPU comercializada como tal, impulsando la evolución del procesamiento gráfico especializado.' },
				{ year: 'Finales de los 90 y década de 2000', short: 'Años 90-2000', title: 'Internet para todos', cats: ['net'], text: 'La banda ancha, el Wi-Fi y las conexiones comerciales amplían el acceso a Internet y favorecen los servicios web.' },
				{ year: 'Década de 2000', title: 'Web 2.0 y redes sociales', cats: ['net', 'sw'], text: 'Los usuarios pasan de consultar páginas a crear, compartir y comentar contenidos en plataformas digitales.' }
			]
		},
		{
			title: 'Movilidad, nube e inteligencia artificial',
			bg: '#26104d', accent: '#ff6bd6',
			events: [
				{ year: '2008', title: 'Expansión del software móvil', cats: ['sw'], text: 'La llegada de Android y la expansión de las tiendas de aplicaciones consolidan el teléfono como plataforma informática.' },
				{ year: 'Década de 2010', title: '4G, smartphones y computación en la nube', cats: ['net', 'hw', 'sw'], text: 'La conexión móvil rápida y los servicios en la nube permiten acceder a aplicaciones y datos desde casi cualquier lugar.' },
				{ year: '2012', title: 'Auge del aprendizaje profundo', cats: ['sw', 'ai'], text: 'El éxito de AlexNet en el reconocimiento de imágenes demuestra el potencial de las redes neuronales profundas y acelera el progreso de la inteligencia artificial.' },
				{ year: '2022', title: 'La inteligencia artificial generativa llega al gran público', cats: ['sw', 'ai'], text: 'La popularización de herramientas como ChatGPT convierte la IA generativa en una tecnología accesible para conversar, crear textos y resolver tareas.' }
			]
		}
	]
};
