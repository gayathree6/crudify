import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Store, ArrowUpRight, Menu, X,
  Package, ShoppingCart, Users, Truck, RotateCcw,
  ChartNoAxesCombined, ShieldCheck, Plus, ScanLine,
  ClipboardList, BellRing, MoveDownRight
} from "lucide-react";
import "./Home.css";

const features = [
  {
    no: "01",
    name: "Inventory, under control.",
    label: "PRODUCT MANAGEMENT",
    description: "Every product, price, category and stock detail. Organized without the clutter.",
    icon: Package,
  },
  {
    no: "02",
    name: "Checkout, redefined.",
    label: "SMART BILLING",
    description: "A smoother way to manage carts, process payments and create customer invoices.",
    icon: ShoppingCart,
  },
  {
    no: "03",
    name: "Purchases, in perspective.",
    label: "PURCHASE MANAGEMENT",
    description: "Record supplier purchases, track incoming stock and keep purchase history organized.",
    icon: ClipboardList,
  },
  {
    no: "04",
    name: "Your team, connected.",
    label: "STAFF MANAGEMENT",
    description: "Give every team member the right workspace with secure role-based access.",
    icon: Users,
  },
  {
    no: "05",
    name: "Suppliers, simplified.",
    label: "SUPPLIER MANAGEMENT",
    description: "Keep supplier details and supplier activity connected to your operations.",
    icon: Truck,
  },
  {
    no: "06",
    name: "Returns, organized.",
    label: "RETURNS MANAGEMENT",
    description: "Review returns, manage approvals and keep your inventory records accurate.",
    icon: RotateCcw,
  },
  {
    no: "07",
    name: "Stay in the know.",
    label: "SMART NOTIFICATIONS",
    description: "Keep track of important retail updates and activity with timely notifications.",
    icon: BellRing,
  },
  {
    no: "08",
    name: "Numbers that tell a story.",
    label: "REPORTS & ANALYTICS",
    description: "Understand transactions, sales and inventory through meaningful reports.",
    icon: ChartNoAxesCombined,
  },
];

function Home() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const items = document.querySelectorAll(".editorial-reveal");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      items.forEach((item) => item.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  const login = () => {
    setMenuOpen(false);
    navigate("/login");
  };

  return (
    <div className="home-page editorial-home">
      {/* NAVIGATION */}
      <nav className="editorial-nav">
        <a href="#home" className="editorial-logo">
          <span className="editorial-logo-icon"><Store size={21} /></span>
          CRUDIFY<span className="logo-dot">.</span>
        </a>

        <div className={`editorial-links ${menuOpen ? "links-open" : ""}`}>
          <a href="#home" onClick={() => setMenuOpen(false)}>01 / HOME</a>
          <a href="#features" onClick={() => setMenuOpen(false)}>02 / CAPABILITIES</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>03 / OUR STORY</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>04 / ACCESS</a>
          <button className="mobile-signin" onClick={login}>
            SIGN IN <ArrowUpRight size={16} />
          </button>
        </div>

        <button className="editorial-signin" onClick={login}>
          SIGN IN <ArrowUpRight size={17} />
        </button>

        <button
          className="editorial-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </nav>

      {/* HERO */}
      <main>
        <section className="editorial-hero" id="home">
          <div className="hero-index">
            <span>INDEPENDENT RETAIL TECHNOLOGY</span>
            <span>EST. 2026 — DIGITAL EDITION</span>
          </div>

          <div className="editorial-hero-main">
            <div className="editorial-title-wrap">
              <p className="editorial-kicker">
                <span></span> A SMARTER WAY TO RUN YOUR STORE
              </p>

              <h1>
                RETAIL
                <span className="title-outline">WITHOUT</span>
                <span className="title-gold">LIMITS.</span>
              </h1>

              <div className="hero-bottom-line">
                <p>
                  The details matter. The workflow matters.
                  Your business deserves a better way to manage both.
                </p>
                <button onClick={login} className="editorial-discover">
                  EXPLORE CRUDIFY <ArrowUpRight size={18} />
                </button>
              </div>
            </div>

            <div className="editorial-hero-side">
              <div className="hero-side-top">
                <span>THE ART OF</span>
                <span>SMARTER OPERATIONS</span>
              </div>

              <div className="hero-visual-art">
                <div className="visual-backdrop"></div>
                <div className="visual-big-number">C.</div>
                <div className="visual-gold-block"></div>
                <div className="visual-outline-square"></div>
                <div className="visual-small-square"></div>
                <div className="visual-vertical-text">ORGANIZE / OPERATE / GROW</div>
                <div className="visual-label">
                  <Store size={27} />
                  <span>THE RETAIL<br />COLLECTIVE</span>
                </div>
              </div>

              <div className="hero-side-bottom">
                <span>ONE CENTRALIZED WORKSPACE</span>
                <ArrowDownRightIcon />
              </div>
            </div>
          </div>

          <div className="hero-footer-line">
            <span>INVENTORY. BILLING. PEOPLE. PERFORMANCE.</span>
            <a href="#features">
              SCROLL TO DISCOVER <MoveDownRight size={15} />
            </a>
          </div>
        </section>

        {/* MOVING TICKER */}
        <div className="editorial-ticker" aria-label="CRUDIFY features">
          <div className="ticker-track">
            {Array.from({ length: 2 }).map((_, index) => (
              <div className="ticker-content" key={index}>
                <span>SMARTER RETAIL</span><Plus />
                <span>SIMPLER BILLING</span><Plus />
                <span>BETTER CONTROL</span><Plus />
                <span>BUSINESS INSIGHTS</span><Plus />
                <span>ONE WORKSPACE</span><Plus />
              </div>
            ))}
          </div>
        </div>

        {/* INTRODUCTION */}
        <section className="editorial-intro" id="about">
          <div className="intro-number editorial-reveal">01 — THE IDEA</div>

          <div className="intro-content editorial-reveal">
            <h2>
              Running a business
              shouldn't feel like
              <p> managing chaos.</p>
            </h2>

            <div className="intro-description">
              <span className="intro-rule"></span>
              <div>
                <p>
                  Meet CRUDIFY. A thoughtfully designed retail management
                  platform that brings your everyday operations into one
                  organized place.
                </p>
                <p>
                  From products and purchases to billing and business
                  reports, the important things stay connected.
                </p>
                <a href="#features">
                  DISCOVER THE DIFFERENCE <ArrowUpRight size={16} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="editorial-features" id="features">
          <div className="features-heading editorial-reveal">
            <div>
              <span className="intro-number">02 — WHAT WE DO</span>
              <h2>Eight ways to make<br /><p>business better.</p></h2>
            </div>
            <p>
              Essential retail tools. Thoughtfully brought together.
              Explore what makes your everyday operations easier.
            </p>
          </div>

          <div className="editorial-feature-layout">
            <div className="feature-list">
              {features.map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <button
                    key={feature.no}
                    className={`editorial-feature-row ${
                      activeFeature === index ? "feature-active" : ""
                    }`}
                    aria-pressed={activeFeature === index}
                    onMouseEnter={() => setActiveFeature(index)}
                    onFocus={() => setActiveFeature(index)}
                    onClick={() => setActiveFeature(index)}
                  >
                    <span className="feature-row-number">{feature.no}</span>
                    <span className="feature-row-name">{feature.name}</span>
                    <span className="feature-row-icon"><Icon size={19} /></span>
                    <ArrowUpRight className="feature-row-arrow" size={19} />
                  </button>
                );
              })}
            </div>

            <div className="feature-detail" key={activeFeature}>
              <span className="detail-label">{features[activeFeature].label}</span>

              <div className="detail-icon">
                {(() => {
                  const Icon = features[activeFeature].icon;
                  return <Icon size={43} strokeWidth={1.2} />;
                })()}
              </div>

              <span className="detail-number">{features[activeFeature].no}</span>
              <h3>{features[activeFeature].name}</h3>
              <p>{features[activeFeature].description}</p>

              <div className="detail-bottom">
                <span>PART OF THE CRUDIFY EXPERIENCE</span>
                <span>0{activeFeature + 1} / 08</span>
              </div>
            </div>
          </div>
        </section>

        {/* STATEMENT */}
        <section className="editorial-statement">
          <div className="statement-side">THE CRUDIFY PRINCIPLE / 03</div>

          <div className="statement-content editorial-reveal">
            <span>GOOD BUSINESS STARTS WITH CLARITY.</span>
            <h2>
              Make space for
              <p> what matters.</p>
            </h2>
            <p>
              Less time navigating disconnected tasks.
              More time understanding and growing your business.
            </p>
            <div className="statement-mark">C</div>
          </div>
        </section>

        {/* WORKSPACES */}
        <section className="editorial-workspaces">
          <div className="workspace-heading editorial-reveal">
            <span className="intro-number">04 — YOUR ACCESS</span>
            <h2>Different roles.<br /><p>One direction.</p></h2>
          </div>

          <div className="workspace-grid">
            <article className="workspace-panel admin-panel editorial-reveal">
              <span className="workspace-no">01 / ADMINISTRATOR</span>
              <div className="workspace-symbol">
                <ChartNoAxesCombined size={34} />
              </div>
              <h3>Take the<br />bigger picture.</h3>
              <p>
                Manage products, staff, suppliers, purchases,
                returns, transactions and reports.
              </p>
              <button onClick={login}>
                ADMIN SIGN IN <ArrowUpRight size={17} />
              </button>
            </article>

            <article className="workspace-panel staff-panel editorial-reveal">
              <span className="workspace-no">02 / BILLING STAFF</span>
              <div className="workspace-symbol"><ScanLine size={34} /></div>
              <h3>Make every<br />sale count.</h3>
              <p>
                Search products, manage carts, process payments
                and generate customer invoices.
              </p>
              <button onClick={login}>
                STAFF SIGN IN <ArrowUpRight size={17} />
              </button>
            </article>
          </div>

          <div className="workspace-note">
            <ShieldCheck size={15} />
            STAFF ACCOUNTS ARE CREATED BY THE ADMINISTRATOR.
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="editorial-final" id="contact">
          <div className="final-topline">
            <span>THE NEXT CHAPTER STARTS HERE.</span>
            <span>CRUDIFY / 2026</span>
          </div>

          <div className="final-content">
            <span className="final-overline">YOUR BUSINESS, RECONSIDERED.</span>
            <h2>
              Make retail
              <p> remarkable.</p>
            </h2>
            <button onClick={login}>
              ENTER CRUDIFY <ArrowUpRight size={19} />
            </button>
          </div>

          <div className="final-bottomline">
            <span>SMART RETAIL MANAGEMENT SYSTEM</span>
            <span>BUILT FOR BETTER BUSINESS.</span>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="editorial-footer">
        <a href="#home" className="editorial-logo">
          <span className="editorial-logo-icon"><Store size={20} /></span>
          CRUDIFY<span className="logo-dot">.</span>
        </a>
        <span>SMART RETAIL MANAGEMENT SYSTEM</span>
        <span>© {new Date().getFullYear()} CRUDIFY. ALL RIGHTS RESERVED.</span>
        <a href="#home" className="footer-top">BACK TO TOP ↑</a>
      </footer>
    </div>
  );
}

function ArrowDownRightIcon() {
  return <MoveDownRight size={17} />;
}

export default Home;