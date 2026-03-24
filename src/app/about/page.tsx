import { ChefHat, Heart, Sparkles } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="page active polka-bg-light" id="aboutPage">
      <section className="about" style={{ position: 'relative', padding: '120px 24px' }}>
        <div className="wavy-border-top" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}></div>
        <div className="section-container" style={{ position: 'relative', zIndex: 2 }}>
          <div className="section-header" style={{ marginBottom: '56px' }}>
            <span className="section-label">Meet the Baker</span>
            <h1 className="section-title" style={{ fontSize: '3.25rem' }}>
              The Heart Behind The Cookie Concept
            </h1>
            <p className="section-subtitle" style={{ maxWidth: '700px' }}>
              Every batch is handcrafted by our founder, a passionate baker who turns simple ingredients into warm, memorable treats.
            </p>
          </div>

          <div className="about-grid">
            <article className="about-card" style={{ borderRadius: '36px', border: '3px solid var(--pink)', background: 'var(--white)' }}>
              <div className="about-icon">
                <ChefHat size={30} color="var(--brown)" strokeWidth={2} />
              </div>
              <h3 style={{ fontSize: '1.4rem' }}>From Family Kitchen to Local Favorite</h3>
              <p>
                What started as weekend baking for friends and family grew into a cookie studio focused on quality, comfort, and creativity in every box.
              </p>
            </article>

            <article className="about-card" style={{ borderRadius: '36px', border: 'none', background: 'var(--pink-light)', transform: 'translateY(18px)' }}>
              <div className="about-icon" style={{ background: 'var(--white)' }}>
                <Heart size={30} color="var(--pink-dark)" strokeWidth={2.2} />
              </div>
              <h3 style={{ fontSize: '1.4rem' }}>Baked with Intention</h3>
              <p>
                The baker personally tests every recipe, sources premium ingredients, and bakes in small batches to keep each cookie fresh and full of flavor.
              </p>
            </article>

            <article className="about-card" style={{ borderRadius: '36px', border: 'none', background: 'var(--pink)' }}>
              <div className="about-icon" style={{ background: 'var(--white)' }}>
                <Sparkles size={30} color="var(--brown)" strokeWidth={2} />
              </div>
              <h3 style={{ fontSize: '1.4rem' }}>The Mission</h3>
              <p>
                Create joyful moments through artisan cookie cakes that feel nostalgic and exciting at the same time - one concept, one bite, one smile at a time.
              </p>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
