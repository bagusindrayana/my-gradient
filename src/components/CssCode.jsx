import React from 'react';

function CssCode({ cssCodeResult }) {
  const cssResultContainerRef = React.useRef(null);
  React.useEffect(() => {
    if (cssResultContainerRef.current) {
      cssResultContainerRef.current.setAttribute('style', cssCodeResult);
    }
  });
  return (
    <section className="card p-4 shadow-soft">
      <h2 className="section-header">CSS Code</h2>
      <pre className="code-output min-h-[100px]">
        <code>
          {cssCodeResult || '/* CSS code will appear here */'}
        </code>
      </pre>
      {/* <div ref={cssResultContainerRef} className='gradient-preview w-full min-h-[250px] transition-all duration-300 mb-3'>
        
      </div> */}
    </section>
  );
}

export default CssCode; 