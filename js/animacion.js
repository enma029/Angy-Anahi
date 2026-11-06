/* ==========================================================
   Para Angy · interacciones y animaciones
   ========================================================== */
(() => {
    'use strict';

    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const $  = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const azar = (a, b) => Math.random() * (b - a) + a;

    /* ---------- Estrellas (portada + hero) ---------- */
    function crearEstrellas(contenedor, cantidad) {
        if (!contenedor) return;
        const frag = document.createDocumentFragment();
        for (let i = 0; i < cantidad; i++) {
            const e = document.createElement('span');
            e.className = 'estrella';
            e.style.left = azar(0, 100) + '%';
            e.style.top = azar(0, 100) + '%';
            e.style.setProperty('--t', azar(1, 2.6).toFixed(1) + 'px');
            e.style.setProperty('--dur', azar(2.4, 5.5).toFixed(1) + 's');
            e.style.setProperty('--ret', azar(0, 4).toFixed(1) + 's');
            frag.appendChild(e);
        }
        contenedor.appendChild(frag);
    }
    crearEstrellas($('.portada-estrellas'), 36);
    crearEstrellas($('#estrellas'), 40);

    /* ---------- Portada: abrir ---------- */
    const portada = $('#portada');
    const boton = $('#abrir');
    document.body.classList.add('bloqueado');
    window.scrollTo(0, 0);

    function abrir() {
        if (document.body.classList.contains('abierto')) return;
        if (navigator.vibrate) navigator.vibrate(30);
        portada.classList.add('abierta');
        document.body.classList.remove('bloqueado');
        document.body.classList.add('abierto');
        setTimeout(() => portada.remove(), 1700);
    }
    boton.addEventListener('click', abrir);
    portada.addEventListener('click', (e) => { if (e.target === portada) abrir(); });

    /* ---------- Revelar al hacer scroll ---------- */
    const observador = new IntersectionObserver((entradas) => {
        entradas.forEach((en) => {
            if (en.isIntersecting) {
                en.target.classList.add('visible');
                observador.unobserve(en.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.revelar').forEach((el) => observador.observe(el));

    /* ---------- Barra de progreso + parallax suave ---------- */
    const barra = $('#progresoScroll');
    const hero = $('.hero-texto');
    let pendiente = false;
    function alScroll() {
        if (pendiente) return;
        pendiente = true;
        requestAnimationFrame(() => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const y = window.scrollY;
            barra.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
            if (!reducir && y < window.innerHeight) {
                hero.style.transform = 'translateY(' + (y * 0.18).toFixed(1) + 'px)';
                hero.style.opacity = Math.max(1 - y / (window.innerHeight * 0.85), 0).toFixed(2);
            }
            pendiente = false;
        });
    }
    window.addEventListener('scroll', alScroll, { passive: true });
    alScroll();

    /* ---------- Carruseles (fotos + video) ---------- */
    $$('.carrusel').forEach((car) => {
        const slides = $$('.slide', car);
        const cont = $('.puntos', car);
        const intervalo = parseInt(car.dataset.intervalo || '4500', 10);
        let actual = 0;
        let timer = null;
        let visible = false;

        const puntos = slides.map((_, i) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'punto';
            b.setAttribute('aria-label', 'Ir a la foto ' + (i + 1));
            b.addEventListener('click', () => { ir(i); reiniciar(); });
            cont.appendChild(b);
            return b;
        });

        function ir(n) {
            actual = (n + slides.length) % slides.length;
            slides.forEach((s, i) => {
                const on = i === actual;
                s.classList.toggle('activa', on);
                if (s.tagName === 'VIDEO') {
                    if (on && visible) { s.currentTime = 0; s.play().catch(() => {}); }
                    else { s.pause(); }
                }
            });
            puntos.forEach((p, i) => p.classList.toggle('activo', i === actual));
        }
        function siguiente() { ir(actual + 1); }
        function iniciar() {
            if (reducir) return;
            detener();
            timer = setInterval(siguiente, intervalo);
        }
        function detener() { clearInterval(timer); timer = null; }
        function reiniciar() { if (visible) iniciar(); }

        // Solo corre cuando se ve en pantalla (ahorra batería)
        new IntersectionObserver((en) => {
            visible = en[0].isIntersecting;
            if (visible) {
                iniciar();
                const s = slides[actual];
                if (s.tagName === 'VIDEO') s.play().catch(() => {});
            } else {
                detener();
                slides.forEach((s) => s.tagName === 'VIDEO' && s.pause());
            }
        }, { threshold: 0.35 }).observe(car);

        // Deslizar con el dedo
        let x0 = null;
        car.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
        car.addEventListener('touchend', (e) => {
            if (x0 === null) return;
            const dx = e.changedTouches[0].clientX - x0;
            if (Math.abs(dx) > 40) { ir(actual + (dx < 0 ? 1 : -1)); reiniciar(); }
            x0 = null;
        }, { passive: true });
        // Toque en los lados (escritorio / sin gesto)
        car.addEventListener('click', (e) => {
            if (e.target.closest('.punto')) return;
            const r = car.getBoundingClientRect();
            ir(actual + (e.clientX - r.left < r.width / 2 ? -1 : 1));
            reiniciar();
        });

        ir(0);
    });

    /* ---------- Galería: visor de fotos ---------- */
    const miniaturas = $$('.gal-item');
    const visor = $('#visor');
    if (visor && miniaturas.length) {
        const imgV = $('#visor-img');
        const cuenta = $('#visor-cuenta');
        const total = miniaturas.length;
        let idx = 0;
        let desde = null;
        const rutaGrande = (i) => 'img/galeria/g-' + String(i + 1).padStart(2, '0') + '.jpg';

        function mostrar(i) {
            idx = (i + total) % total;
            imgV.src = rutaGrande(idx);
            imgV.alt = miniaturas[idx].querySelector('img').alt;
            cuenta.textContent = (idx + 1) + ' / ' + total;
            // precarga la siguiente para que el cambio sea fluido
            new Image().src = rutaGrande((idx + 1) % total);
        }
        function abrirVisor(i) {
            desde = document.activeElement;
            visor.hidden = false;
            document.body.classList.add('visor-abierto');
            mostrar(i);
            requestAnimationFrame(() => visor.classList.add('abierto'));
            $('.visor-cerrar', visor).focus({ preventScroll: true });
        }
        function cerrarVisor() {
            visor.classList.remove('abierto');
            document.body.classList.remove('visor-abierto');
            setTimeout(() => { visor.hidden = true; imgV.removeAttribute('src'); }, 300);
            if (desde && desde.focus) desde.focus({ preventScroll: true });
        }

        miniaturas.forEach((b, i) => b.addEventListener('click', () => abrirVisor(i)));
        $('.visor-cerrar', visor).addEventListener('click', cerrarVisor);
        $('.visor-ant', visor).addEventListener('click', () => mostrar(idx - 1));
        $('.visor-sig', visor).addEventListener('click', () => mostrar(idx + 1));
        visor.addEventListener('click', (e) => { if (e.target === visor || e.target.tagName === 'FIGURE') cerrarVisor(); });
        document.addEventListener('keydown', (e) => {
            if (visor.hidden) return;
            if (e.key === 'Escape') cerrarVisor();
            else if (e.key === 'ArrowLeft') mostrar(idx - 1);
            else if (e.key === 'ArrowRight') mostrar(idx + 1);
        });
        let tx = null;
        visor.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
        visor.addEventListener('touchend', (e) => {
            if (tx === null) return;
            const dx = e.changedTouches[0].clientX - tx;
            if (Math.abs(dx) > 45) mostrar(idx + (dx < 0 ? 1 : -1));
            tx = null;
        }, { passive: true });
    }

    /* ---------- Reproductores de audio ---------- */
    const tarjetas = $$('.audio-card');
    const fmt = (s) => {
        if (!isFinite(s)) return '0:00';
        const m = Math.floor(s / 60);
        const r = Math.floor(s % 60).toString().padStart(2, '0');
        return m + ':' + r;
    };
    const iconoPlay = '<svg viewBox="0 0 24 24"><use href="#i-play"/></svg>';
    const iconoPausa = '<svg viewBox="0 0 24 24"><use href="#i-pausa"/></svg>';

    tarjetas.forEach((card) => {
        const audio = $('audio', card);
        const btn = $('.play', card);
        const barraA = $('.barra', card);
        const relleno = $('.relleno', card);
        const tiempo = $('.tiempo', card);

        audio.addEventListener('loadedmetadata', () => { tiempo.textContent = fmt(audio.duration); });
        audio.addEventListener('timeupdate', () => {
            const p = audio.duration ? audio.currentTime / audio.duration : 0;
            relleno.style.width = (p * 100).toFixed(1) + '%';
            tiempo.textContent = fmt(audio.currentTime);
        });
        audio.addEventListener('play', () => {
            card.classList.add('sonando');
            btn.innerHTML = iconoPausa;
            btn.setAttribute('aria-label', 'Pausar audio');
        });
        const parado = () => {
            card.classList.remove('sonando');
            btn.innerHTML = iconoPlay;
            btn.setAttribute('aria-label', 'Reproducir audio');
        };
        audio.addEventListener('pause', parado);
        audio.addEventListener('ended', () => {
            parado();
            relleno.style.width = '0%';
            tiempo.textContent = fmt(audio.duration);
            audio.currentTime = 0;
        });

        btn.addEventListener('click', () => {
            if (audio.paused) {
                tarjetas.forEach((o) => { const a = $('audio', o); if (a !== audio) a.pause(); });
                audio.play().catch(() => {});
            } else {
                audio.pause();
            }
        });

        // Tocar la barra para saltar a ese momento
        barraA.addEventListener('click', (e) => {
            if (!audio.duration) return;
            const r = barraA.getBoundingClientRect();
            audio.currentTime = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1) * audio.duration;
        });
    });
})();
