import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './RoleSelector.css';

export default function RoleSelector() {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [mobOpen, setMobOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

    // Contact Form State
    const [formValid, setFormValid] = useState(true);
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [submittedEmail, setSubmittedEmail] = useState('');

    const fnRef = useRef<HTMLInputElement>(null);
    const emailRef = useRef<HTMLInputElement>(null);
    const msgRef = useRef<HTMLTextAreaElement>(null);

    // Scroll effect for navbar
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Intersection Observer for .reveal
    useEffect(() => {
        const revealObs = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('visible');
                    revealObs.unobserve(e.target);
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

        // Stagger portal & step cards
        document.querySelectorAll('.portal-grid, .steps-row').forEach(wrap => {
            wrap.querySelectorAll('.portal-card, .step-box').forEach((c, i) => {
                (c as HTMLElement).style.transitionDelay = `${i * 0.1}s`;
            });
        });

        return () => revealObs.disconnect();
    }, []);

    // Close modal on escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setModalOpen(false);
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Lock body scroll when modal open
    useEffect(() => {
        if (modalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [modalOpen]);

    const smoothScroll = (id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setMobOpen(false);
    };

    const submitForm = () => {
        let valid = true;
        [fnRef, emailRef, msgRef].forEach(ref => {
            if (ref.current && !ref.current.value.trim()) {
                ref.current.style.borderColor = '#ef4444';
                valid = false;
            } else if (ref.current) {
                ref.current.style.borderColor = '';
            }
        });

        if (!valid) {
            setFormValid(false);
            return;
        }

        setSubmittedEmail(emailRef.current?.value || '');
        setFormSubmitted(true);
    };

    const handlePortalClick = (role: string) => {
        setModalOpen(false);
        navigate(`/login?role=${role}`);
    };

    return (
        <>
            {/* NAVBAR */}
            <nav id="navbar" className={scrolled ? 'scrolled' : ''}>
                <div className="nav-logo">
                    <div className="nav-logo-icon">🚆</div>
                    RailEase
                </div>
                <ul className="nav-links">
                    <li><a onClick={() => smoothScroll('portals')}>Portals</a></li>
                    <li><a onClick={() => smoothScroll('how')}>How It Works</a></li>
                    <li><a onClick={() => smoothScroll('contact')}>Contact</a></li>
                </ul>
                <button className="nav-signin" onClick={() => setModalOpen(true)}>Sign In</button>
                <button className="hamburger" onClick={() => setMobOpen(!mobOpen)} aria-label="menu">
                    <span /><span /><span />
                </button>
            </nav>
            <div className={`mobile-menu ${mobOpen ? 'open' : ''}`} id="mob">
                <a onClick={() => smoothScroll('portals')}>Portals</a>
                <a onClick={() => smoothScroll('how')}>How It Works</a>
                <a onClick={() => smoothScroll('contact')}>Contact</a>
                <button className="nav-signin" style={{ width: 'fit-content' }} onClick={() => { setModalOpen(true); setMobOpen(false); }}>Sign In</button>
            </div>

            {/* TRAIN TICKER */}
            <div className="track-wrap">
                <div className="track-rail"></div>
                <div className="train-scroll">🚂🚃🚃🚃🚃</div>
            </div>

            {/* HERO */}
            <section className="hero">
                <div className="hero-eyebrow"><span className="blink"></span> Smart RAC Reallocation System</div>
                <h1>No empty seat.<br />No <em>confused</em> passenger.</h1>
                <p className="hero-sub">RailEase connects TTEs, passengers, and railway admins on one platform — automating berth upgrades, waitlist confirmations, and journey notifications in real time.</p>
                <div className="hero-btns">
                    <button className="btn-blue" onClick={() => setModalOpen(true)}>Sign In →</button>
                    <button className="btn-ghost" onClick={() => smoothScroll('how')}>How It Works</button>
                </div>
            </section>

            {/* PORTALS */}
            <section id="portals" style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <div className="portals">
                    <div className="section-eyebrow reveal">Access</div>
                    <h2 className="section-title reveal">Three portals, one platform</h2>
                    <p className="section-sub reveal">Each role gets a dedicated workspace built for exactly what they need to do.</p>
                    <div className="portal-grid">

                        <div className="portal-card p-admin reveal" onClick={() => setModalOpen(true)}>
                            <div className="portal-ico-wrap" style={{ fontSize: '1.5rem' }}>🖥️</div>
                            <h3>Admin Portal</h3>
                            <p>Full system oversight for railway officials. Manage trains, zones, TTE assignments, and monitor platform-wide operations.</p>
                            <ul className="portal-list">
                                <li>Train &amp; schedule management</li>
                                <li>TTE account management</li>
                                <li>Platform-wide reporting</li>
                                <li>System configuration</li>
                            </ul>
                            <button className="portal-btn">Access Admin Portal →</button>
                        </div>

                        <div className="portal-card p-tte reveal" onClick={() => setModalOpen(true)}>
                            <div className="portal-ico-wrap" style={{ fontSize: '1.5rem' }}>🪪</div>
                            <h3>TTE Portal</h3>
                            <p>For Travelling Ticket Examiners. Manage your assigned train's passenger list, trigger upgrades, and log station events on the go.</p>
                            <ul className="portal-list">
                                <li>Live passenger chart</li>
                                <li>One-tap RAC upgrades</li>
                                <li>Station reallocation</li>
                                <li>Secure OTP login</li>
                            </ul>
                            <button className="portal-btn">Access TTE Portal →</button>
                        </div>

                        <div className="portal-card p-pass reveal" onClick={() => setModalOpen(true)}>
                            <div className="portal-ico-wrap" style={{ fontSize: '1.5rem' }}>🎫</div>
                            <h3>Passenger Portal</h3>
                            <p>For travellers. Track your booking status live, get notified the instant your seat is confirmed, and manage your journey details.</p>
                            <ul className="portal-list">
                                <li>Live seat status</li>
                                <li>Instant upgrade alerts</li>
                                <li>Journey history</li>
                                <li>In-app notifications</li>
                            </ul>
                            <button className="portal-btn">Access Passenger Portal →</button>
                        </div>

                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section id="how" className="how">
                <div className="how-inner">
                    <div className="how-intro">
                        <div className="section-eyebrow reveal">The Process</div>
                        <h2 className="section-title reveal" style={{ margin: '0 auto .65rem' }}>How RailEase Works</h2>
                        <p className="section-sub reveal">From the moment a TTE logs in to the moment a passenger gets their seat — everything is handled automatically.</p>
                    </div>

                    <div className="how-train-wrap">
                        <div className="how-rail"></div>
                        <div className="how-train">🚂🚃🚃</div>
                    </div>

                    <div className="steps-row">
                        <div className="step-box reveal">
                            <div className="step-circle">01</div>
                            <h4>TTE Logs In</h4>
                            <p>The TTE signs in securely and gets instant access to their assigned train's full passenger chart.</p>
                        </div>
                        <div className="step-box reveal">
                            <div className="step-circle">02</div>
                            <h4>System Scans for Vacancies</h4>
                            <p>RailEase automatically checks which RAC and waitlisted passengers are eligible for available berths.</p>
                        </div>
                        <div className="step-box reveal">
                            <div className="step-circle">03</div>
                            <h4>Passenger Gets Upgraded</h4>
                            <p>The highest-priority RAC passenger is moved to a confirmed berth — instantly and fairly, every time.</p>
                        </div>
                        <div className="step-box reveal">
                            <div className="step-circle">04</div>
                            <h4>Notification Sent</h4>
                            <p>The passenger receives an alert on their phone the moment their seat is confirmed. No waiting, no confusion.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CONTACT */}
            <section id="contact" className="contact-section">
                <div className="contact-info reveal">
                    <div className="section-eyebrow">Help &amp; Support</div>
                    <h2>Have a question about your journey?</h2>
                    <p>Reach out to our support team for help with bookings, seat upgrades, RAC status, or any travel-related query. We're here to help.</p>
                    <div className="c-details">
                        <div className="c-row">
                            <div className="c-icon">📧</div>
                            <div className="c-txt">
                                <strong>Email Support</strong>
                                <span>kalyan@railease.in<br />We respond within 24 hours</span>
                            </div>
                        </div>
                        <div className="c-row">
                            <div className="c-icon">📞</div>
                            <div className="c-txt">
                                <strong>Helpline</strong>
                                <span>+91 98765 43210<br />Mon – Sat · 8 AM to 8 PM IST</span>
                            </div>
                        </div>
                        <div className="c-row">
                            <div className="c-icon">🏢</div>
                            <div className="c-txt">
                                <strong>Office</strong>
                                <span>Rail Bhavan, Raisina Road<br />New Delhi – 110 001</span>
                            </div>
                        </div>
                        <div className="c-row">
                            <div className="c-icon">🛟</div>
                            <div className="c-txt">
                                <strong>24×7 Technical Issues</strong>
                                <span>support@railease.in</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="contact-form-wrap reveal" id="contactFormWrap">
                    {!formSubmitted ? (
                        <>
                            <h3>Send us a message</h3>
                            <p>For queries about your ticket, RAC status, upgrades, or anything else.</p>
                            <div className="cf-row">
                                <div className="form-group"><label>First Name</label><input type="text" placeholder="Kalyan" ref={fnRef} /></div>
                                <div className="form-group"><label>Last Name</label><input type="text" placeholder="Sharma" id="cf-ln" /></div>
                            </div>
                            <div className="cf-full"><label>Email Address</label><input type="email" placeholder="kalyan@gmail.com" ref={emailRef} /></div>
                            <div className="cf-full"><label>PNR Number (optional)</label><input type="text" placeholder="e.g. 2345678901" id="cf-pnr" /></div>
                            <div className="cf-full">
                                <label>Query Type</label>
                                <select id="cf-type" style={{ width: '100%', padding: '.7rem 1rem', border: '1.5px solid var(--border)', borderRadius: '9px', fontFamily: 'inherit', fontSize: '.88rem', color: 'var(--ink)', background: '#fff', outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                                    <option value="">Select a topic…</option>
                                    <option>RAC / Waitlist Status</option>
                                    <option>Seat Upgrade Query</option>
                                    <option>TTE Complaint</option>
                                    <option>Notification Not Received</option>
                                    <option>Account Issue</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div className="cf-full"><label>Message</label><textarea ref={msgRef} placeholder="Describe your query in detail…"></textarea></div>
                            <button className="cf-submit" onClick={submitForm}>Submit Query →</button>
                        </>
                    ) : (
                        <div className="form-success visible" id="formSuccess">
                            <div className="tick">✅</div>
                            <h4>Query received!</h4>
                            <p>We'll get back to you at <span id="successEmail" style={{ color: 'var(--blue)', fontWeight: 600 }}>{submittedEmail}</span> within 24 hours.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* CTA BANNER */}
            <div className="cta-banner reveal">
                <h2>Ready to get started?</h2>
                <p>Sign in to your portal and experience smarter railway management today.</p>
                <button className="btn-wh" onClick={() => setModalOpen(true)}>Sign In to Portal</button>
                <button className="btn-wh-o" onClick={() => smoothScroll('contact')}>Contact Support</button>
            </div>

            {/* FOOTER */}
            <footer>
                <div className="footer-brand">
                    <div className="fl">🚆 RailEase</div>
                    <p>Smart RAC Reallocation System built for Indian Railways — connecting passengers, TTEs, and administrators on one platform.</p>
                </div>
                <div className="footer-col">
                    <h4>Platform</h4>
                    <ul>
                        <li><a onClick={() => smoothScroll('portals')}>Admin Portal</a></li>
                        <li><a onClick={() => smoothScroll('portals')}>TTE Portal</a></li>
                        <li><a onClick={() => smoothScroll('portals')}>Passenger Portal</a></li>
                        <li><a onClick={() => smoothScroll('how')}>How It Works</a></li>
                    </ul>
                </div>
                <div className="footer-col">
                    <h4>Support</h4>
                    <ul>
                        <li><a onClick={() => smoothScroll('contact')}>Contact Us</a></li>
                        <li><a href="#">Help Centre</a></li>
                        <li><a href="#">Report an Issue</a></li>
                        <li><a href="#">FAQs</a></li>
                    </ul>
                </div>
                <div className="footer-col">
                    <h4>Legal</h4>
                    <ul>
                        <li><a href="#">Privacy Policy</a></li>
                        <li><a href="#">Terms of Service</a></li>
                        <li><a href="#">Grievance Redressal</a></li>
                    </ul>
                </div>
            </footer>
            <div className="footer-bottom">
                <p>© 2026 RailEase Technologies Pvt. Ltd. · Built for Indian Railways</p>
                <div className="t-tags">
                    <span className="t-tag">Node.js</span>
                    <span className="t-tag">MongoDB</span>
                    <span className="t-tag">WebSockets</span>
                    <span className="t-tag">React</span>
                </div>
            </div>

            {/* SIGN IN MODAL */}
            <div
                className={`modal-overlay ${modalOpen ? 'open' : ''}`}
                id="modalOverlay"
                onClick={(e) => {
                    if ((e.target as HTMLElement).id === 'modalOverlay') setModalOpen(false);
                }}
            >
                <div className="modal" id="modal">
                    <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
                    <div className="modal-header">
                        <h3>Welcome to RailEase</h3>
                        <p>Choose your portal to continue</p>
                    </div>
                    <div className="modal-portals">
                        <button className="portal-option po-admin" onClick={() => handlePortalClick('admin')}>
                            <div className="po-icon">🖥️</div>
                            <div className="po-text">
                                <h4>Admin Portal</h4>
                                <p>Railway officials &amp; system administrators</p>
                            </div>
                            <span className="po-arrow">→</span>
                        </button>
                        <button className="portal-option po-tte" onClick={() => handlePortalClick('tte')}>
                            <div className="po-icon">🪪</div>
                            <div className="po-text">
                                <h4>TTE Portal</h4>
                                <p>Travelling Ticket Examiners</p>
                            </div>
                            <span className="po-arrow">→</span>
                        </button>
                        <button className="portal-option po-pass" onClick={() => handlePortalClick('passenger')}>
                            <div className="po-icon">🎫</div>
                            <div className="po-text">
                                <h4>Passenger Portal</h4>
                                <p>Track your booking &amp; seat upgrades</p>
                            </div>
                            <span className="po-arrow">→</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
