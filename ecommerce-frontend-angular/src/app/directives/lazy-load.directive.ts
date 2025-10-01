import { Directive, ElementRef, EventEmitter, OnInit, Output } from '@angular/core';

@Directive({
  selector: '[appLazyLoad]'
})
export class LazyLoadDirective implements OnInit {
  @Output() lazyLoad = new EventEmitter<void>();

  constructor(private element: ElementRef) {}

  ngOnInit() {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.lazyLoad.emit();
          observer.unobserve(this.element.nativeElement);
        }
      });
    });

    observer.observe(this.element.nativeElement);
  }
}