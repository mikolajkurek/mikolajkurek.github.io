document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(SplitText)
    gsap.registerPlugin(ScrollTrigger)

    ScrollSmoother.create({
        smooth: 0.2,
    });

    let initialStaggerSplit = SplitText.create(".initialStagger", {
        type: "lines"
    })

    gsap.from(initialStaggerSplit.lines, {
        y: 50,
        ease: "back.out",
        autoAlpha: 0,
        stagger: {
            amount: 1.5,
        }
    })

    gsap.from(".projects", {
        xPercent: 100,
        scrollTrigger: {
            // markers: true,
            trigger: ".section2",
            start: "top 90%",
            end: "center center",
            scrub: 1,
        }
    })


    // let heroSplit = SplitText.create(".hero", {
    //     type: "chars"
    // })

    // gsap.from(heroSplit.chars, {
    //     // yPercent: "random([-100, 100])",
    //     y: 50,
    //     rotation: "random(-30, 30)",
    //     ease: "back.out",
    //     autoAlpha: 0,
    //     stagger: {
    //         amount: 1.5,
    //         // from: "random"
    //     }
    // })

    // gsap.to(heroSplit.chars, {
    //     autoAlpha: 0,
    //     stagger: {
    //         amount: 1.5,
    //         from: "end"
    //     },
    //     scrollTrigger: {
    //         markers: true,
    //         trigger: ".hero",
    //         start: "70% center",
    //         end: "bottom center",
    //         scrub: 1,
    //     }
    // })

    // let projectsSplit = SplitText.create(".projects", {
    //     type: "lines"
    // })
    //
    // gsap.from(projectsSplit.lines, {
    //     y: 50,
    //     ease: "back.out",
    //     autoAlpha: 0,
    //     stagger: {
    //         amount: 1,
    //     },
    //     scrollTrigger: {
    //         // markers: true,
    //         trigger: ".projects",
    //         start: "top center",
    //         // scrub: 1
    //     }
    // })

    const st = SplitText.create(".scrambleEffect", { type: "chars", charsClass: "char" });

    st.chars.forEach((char) => {
        gsap.set(char, { attr: { "data-content": char.innerHTML } });
    });

    const section1 = document.querySelector(".section1");

    section1.onpointermove = (e) => {
        st.chars.forEach((char) => {
            const rect = char.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = e.clientX - cx;
            const dy = e.clientY - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 50)
                gsap.to(char, {
                    overwrite: true,
                    duration: 1.2 -dist / 50,
                    scrambleText: {
                        text: char.dataset.content,
                        chars: ".:",
                        speed: 0.5,
                    },
                    ease:'none'
                });
        });
    };

    const section2 = document.querySelector(".section2");

    section2.onpointermove = (e) => {
        st.chars.forEach((char) => {
            const rect = char.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = e.clientX - cx;
            const dy = e.clientY - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 50)
                gsap.to(char, {
                    overwrite: true,
                    duration: 1.2 -dist / 50,
                    scrambleText: {
                        text: char.dataset.content,
                        chars: ".:",
                        speed: 0.5,
                    },
                    ease:'none'
                });
        });
    };


})