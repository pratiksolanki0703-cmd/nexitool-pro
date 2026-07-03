// Header logo animation: a small ball hops across the "nexitool.pro" wordmark once, after the page has fully loaded.
(function() {
    function runLogoAnimation() {
        const container = document.getElementById('logoAnimated');
        const ball = document.getElementById('logoBall');
        if (!container || !ball) return;

        const words = container.querySelectorAll('.logo-word');
        if (!words.length) return;

        const containerRect = container.getBoundingClientRect();
        const ballWidth = ball.offsetWidth || 14;
        const jumpHeight = 14; // px, stays well inside the 64px header
        const hopDuration = 380; // ms per hop
        const pauseBetween = 60; // ms between hops

        const positions = Array.from(words).map(w => {
            const r = w.getBoundingClientRect();
            return (r.left - containerRect.left) + (r.width / 2) - (ballWidth / 2);
        });

        let currentX = positions[0];
        ball.style.transform = `translate(${currentX}px, 0px)`;
        ball.style.opacity = '1';

        function hopTo(index) {
            if (index >= positions.length) {
                ball.animate(
                    [{ opacity: 1 }, { opacity: 0 }],
                    { duration: 300, delay: 200, fill: 'forwards' }
                );
                return;
            }

            const from = currentX;
            const to = positions[index];
            const mid = (from + to) / 2;

            const anim = ball.animate(
                [
                    { transform: `translate(${from}px, 0px)` },
                    { transform: `translate(${mid}px, -${jumpHeight}px)` },
                    { transform: `translate(${to}px, 0px)` }
                ],
                { duration: hopDuration, easing: 'ease-in-out', fill: 'forwards' }
            );

            currentX = to;
            anim.onfinish = () => setTimeout(() => hopTo(index + 1), pauseBetween);
        }

        setTimeout(() => hopTo(1), 250);
    }

    window.addEventListener('load', function() {
        // small delay so the fetch()-injected header component is guaranteed to be in the DOM
        setTimeout(runLogoAnimation, 150);
    });
})();
