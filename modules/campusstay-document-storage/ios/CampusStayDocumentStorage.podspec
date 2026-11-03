Pod::Spec.new do |s|
  s.name = 'CampusStayDocumentStorage'
  s.version = '1.0.0'
  s.summary = 'Private session attachment staging for CampusStay'
  s.description = s.summary
  s.license = { :type => 'Private' }
  s.author = 'CampusStay'
  s.homepage = 'https://example.invalid/campusstay'
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.source = { :path => '.' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
end
