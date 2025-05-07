document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(SplitText)
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

    ScrollSmoother.create({
        smooth: 0.2,
        effects: true
    });

    let initialStaggerSplit = SplitText.create(".initialStagger", {
        type: "lines"
    })

    // Animating the lines on load
    gsap.from(initialStaggerSplit.lines, {
        y: 50,
        ease: "back.out",
        autoAlpha: 0,
        stagger: {
            amount: 1.5,
        }
    })

    // Sliding the projects menu from the right
    gsap.from(".projectsMenu", {
        x: document.querySelector(".projectsMenu").offsetWidth,
        scrollTrigger: {
            // markers: true,
            trigger: ".section2",
            start: "top 90%",
            end: "top 30%",
            scrub: 1,
        }
    })

    // Pinning the projects menu
    gsap.to(".section2", {
        scrollTrigger: {
            trigger: ".section2",
            start: "top top",
            end: "bottom bottom",
            pin: ".projectsMenu",
            pinSpacing: false,
            // markers: true,
        }
    });

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

    const st = SplitText.create(".scrambleEffect", { type: "chars words", charsClass: "char" });

    st.chars.forEach((char) => {
        gsap.set(char, { attr: { "data-content": char.innerHTML } });
    });

    // Scramble effect for page 1
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

    // Scramble effect for page 2
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

    // Projects Menu scrolling
    const projectsListElements = document.querySelectorAll(".projectsListElement");
    const projects = document.querySelectorAll(".projectSection");

    let scrolling = false;
    projectsListElements.forEach((element, index) => {
        element.addEventListener("click", () => {
            scrolling = true;
            projectsListElements.forEach((el) => el.classList.remove("active"));
            element.classList.add("active");

            gsap.to(window, {
                duration: 1,
                scrollTo: projects[index],
                overwrite: "auto",
                ease: "power2.inOut",
                onComplete: () => {scrolling = false}
            });
        })
    })

    // Projects info snapping
    ScrollTrigger.create({
        trigger: '.section1',
        start: 'top top',
        endTrigger: '.section2',
        end: 'bottom bottom',
        // markers: true,

        snap: {
            snapTo: 1 / ((projects.length - 1) + 1),
            duration: {min: 0.25, max: 0.75},
            delay: 0.1,
            ease: 'power1.inOut',
            directional: false,
        }
    });

    // Projects info active class on scroll
    projects.forEach((project, index) => {
        ScrollTrigger.create({
            trigger: project,
            start: "top 10%",
            end: "bottom 90%",
            onEnter: () => {
                if (scrolling) return;
                projectsListElements.forEach((el) => el.classList.remove("active"));
                projectsListElements[index].classList.add("active");
            },
            onEnterBack: () => {
                if (scrolling) return;
                projectsListElements.forEach((el) => el.classList.remove("active"));
                projectsListElements[index].classList.add("active");
            },
        });
    });
})