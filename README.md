# HoopTutor – Basketball Training Resources Library

**Project Description**

HoopTutor is a simple, interactive website designed to provide basketball players with a curated collection of training resources. The platform organizes drills, workout plans, and educational content into easy-to-navigate categories such as:

- Shooting  
- Ball-handling  
- Defense  
- Fitness

The aim is to create an accessible hub where players of all levels can quickly find trusted drills and tips to improve their game.

**Key Features**

- Categorized library of videos, articles, and images  
- Search and filter by skill level or focus area  
- "Save to Favorites" feature  
- Mobile-friendly design for on-the-go access  

---

**Functional Requirements**

*1. User Interface*

- Homepage with clear category tiles: Shooting, Ball-handling, Defense, Fitness  
- Resource cards showing titles, descriptions, and media  
- Search and filter tools  
- Favorites/bookmark system using browser storage

*2. Content Management*

- Resource database stored in a JSON file or simple CMS  
- Easy to update, add, or remove resources

*3. User Interaction*

- Responsive design for mobile, tablet, and desktop  
- Resource click opens detailed view with instructions/media  
- Favorites persist locally

*4. Deployment*

- Deployed using GitHub Pages for public access

---

**Non-Functional Requirements**

*1. Performance*

- Fast loading with optimized media  
- Lightweight site architecture with minimal dependencies

*2. Usability*

- Intuitive layout with simple navigation  
- Concise, helpful drill descriptions  
- Designed with mobile-first principles

*3. Reliability*

- Local storage for session persistence  
- Error handling for missing or broken media links

*4. Maintainability*

- Modular, readable code using HTML, CSS, JavaScript  
- Simple structure allows non-technical updates

*5. Scalability*

- Future-ready: Easily expandable with more categories or community-submitted drills 



---
## Design Choices (Initial)
| Element         | Choice                                                                 | Reason                                                                                  |
|----------------|------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| **Colour Palette** | Primary: #274472 (Dark Blue), Secondary: #A3CEF1 (Light Blue), Accent: #F6F6F6 | Creates a modern, clean, and calming look that feels sporty yet educational            |
| **Typography**     | Headings: 'Montserrat' (bold), Body: 'Open Sans' '                    | Montserrat adds structure and boldness, while Open Sans ensures effective readability            |
| **Button Style**   | Rounded corners, filled primary colour on hover                      | Friendly and accessible; hover feedback adds interactivity                              |
| **Icon Style**     | Flat SVG or minimal outline icons with consistent line weight        | Keeps UI consistent and clean; avoids visual clutter                                   |
| **Imagery**        | Action-oriented photos (e.g. players training or mid-play shots)      | Adds energy and motivation; reflects target audience aspirations                        |
| **Forms**          | Simple layout with floating labels and subtle shadows                | Clean look with high usability on both desktop and mobile                              |



## Initial Design
![Initial Wireframe](Images/InitialWireframe.png)

## Alternative Design
![HoopTutorAlternativeDesign](Images/HoopTutorAlternativeDesign.png)

## Design Choices (Alternative)

| Design Element          | Choice Made                                                                                   | Reasoning                                                                                      |
|-------------------------|-----------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| **Colour Scheme**       | I used the colours red, white, and black with minimal accents                                              | Red conveys energy and urgency, and black and white keeps it clean and professional |
| **Typography**          | Bold sans-serif for headings, lighter sans-serif for body text                                | Improves readability and makes the headings stand out                                          |
| **Navigation Bar**      | Top horizontal navigation with bold active link highlight (red underline on active page)      | Keeps navigation consistent and visible                                        |
| **Hero Image**          | Full-width background image of basketball players in action                                   | Creates immediate visual engagement and sets a sporty tone                                     |
| **Layout**              | Centralised hero text with call-to-action buttons below event listings                        | Guides the user’s eye from the main title to actionable items                                  |
| **Event Listings**      | Clean list format with date, title, and location; “Buy Tickets” button in red                 | Simple structure allows quick scanning; red buttons draw attention to actions                  |
| **Call-to-Action Buttons** | Bright red with white text                                                                  | High contrast for visibility; consistent with brand colour                                     |
| **Icons/Social Media**  | Small, consistent icons in header for Facebook, Youtube, etc.                              | Provides easy access to community channels without cluttering the page                         |
| **Spacing & Alignment** | Generous white space, consistent padding, and aligned text/button placements                  | Improves visual clarity                            |

## Login Function Algorithm
![Algorithm](Images/Algorithm.png)