import { Link } from 'react-router-dom';
import { BookOpen, Github, Twitter, Instagram, Youtube } from 'lucide-react';

const footerSections = [
  {
    title: 'Tentang',
    links: [
      { label: 'Tentang Kami', path: '#' },
      { label: 'FAQ', path: '#' },
      { label: 'Kontak', path: '#' },
    ],
  },
  {
    title: 'Penulis',
    links: [
      { label: 'Panduan Penulis', path: '#' },
      { label: 'Syarat & Ketentuan', path: '#' },
      { label: 'Kebijakan Privasi', path: '#' },
    ],
  },
  {
    title: 'Jelajahi',
    links: [
      { label: 'Novel', path: '/novel' },
      { label: 'Genre', path: '/genre' },
      { label: 'Ranking', path: '/ranking' },
      { label: 'Komunitas', path: '/komunitas' },
    ],
  },
];

const socials = [
  { icon: Twitter, label: 'Twitter' },
  { icon: Instagram, label: 'Instagram' },
  { icon: Youtube, label: 'Youtube' },
  { icon: Github, label: 'Github' },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-card/50">
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary glow-primary-sm">
                <BookOpen size={20} className="text-white" />
              </div>
              <span className="font-display text-lg font-bold">
                Novel <span className="text-primary">Semesta</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Temukan Cerita. Ciptakan Semesta. Platform membaca dan menerbitkan novel online untuk para pencinta cerita.
            </p>
            <div className="mt-5 flex gap-2">
              {socials.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href="#"
                    aria-label={social.label}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Link sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="font-display text-sm font-semibold text-foreground">{section.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.path}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Novel Semesta. Hak cipta dilindungi.
          </p>
          <p className="text-xs text-muted-foreground">
            Dibuat dengan dedikasi untuk para pembaca.
          </p>
        </div>
      </div>
    </footer>
  );
}
